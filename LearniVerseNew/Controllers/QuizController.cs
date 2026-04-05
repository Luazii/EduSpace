using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels;
using LearniVerseNew.Models.ApplicationModels.ViewModels;
using Microsoft.AspNet.Identity;
using Newtonsoft.Json;

namespace LearniVerseNew.Controllers
{
    public class QuizController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        // ─── STUDENT: pre-quiz info/availability check ───────────────────────────

        [Authorize(Roles = "User")]
        public ActionResult TakeQuiz(Guid QuizID)
        {
            var quiz = db.Quizzes.Find(QuizID);
            if (quiz == null) return HttpNotFound();

            var studentId = User.Identity.GetUserId();
            int attemptCount = db.QuizAttempts.Count(a => a.QuizID == QuizID && a.StudentID == studentId);

            // Quiz is available only on its scheduled date, within the start/end window
            var now = DateTime.Now;
            bool wrongDate    = now.Date != quiz.QuizDate.Date;
            bool beforeWindow = now.TimeOfDay < quiz.QuizStart;
            bool afterWindow  = now.TimeOfDay > quiz.QuizEnd;

            if (wrongDate || beforeWindow || afterWindow)
            {
                ViewBag.QuizAvailabilityMessage = wrongDate
                    ? $"This quiz is scheduled for {quiz.QuizDate:dd MMM yyyy}."
                    : beforeWindow
                        ? $"This quiz opens at {quiz.QuizStart:hh\\:mm}."
                        : $"This quiz closed at {quiz.QuizEnd:hh\\:mm}.";
                ViewBag.CourseID = quiz.CourseID;
                return View("QuizNotAvailable");
            }

            if (quiz.Status != "Published")
            {
                ViewBag.QuizAvailabilityMessage = "This quiz has not been published yet.";
                ViewBag.CourseID = quiz.CourseID;
                return View("QuizNotAvailable");
            }

            ViewBag.UserAttempts    = attemptCount;
            ViewBag.AttemptsAllowed = quiz.MaxAttempts;
            return View(quiz);
        }

        // ─── STUDENT: take the quiz ───────────────────────────────────────────────

        [Authorize(Roles = "User")]
        public ActionResult Quiz(Guid QuizID)
        {
            var studentId = User.Identity.GetUserId();
            var quiz = db.Quizzes.Include(q => q.Questions).FirstOrDefault(q => q.QuizID == QuizID);
            if (quiz == null) return HttpNotFound();

            int attemptCount = db.QuizAttempts.Count(a => a.QuizID == QuizID && a.StudentID == studentId);
            if (attemptCount >= quiz.MaxAttempts)
            {
                ViewBag.QuizAvailabilityMessage = "You have used all your attempts for this quiz.";
                ViewBag.CourseID = quiz.CourseID;
                return View("QuizNotAvailable");
            }

            var viewModel = new QuizViewModel
            {
                Quiz               = quiz,
                Questions          = quiz.Questions.OrderBy(q => q.QuestionNumber).ToList(),
                SubmittedAnswers   = new Dictionary<Guid, string>(),
                CurrentQuestionIndex = 0
            };

            // Store quiz ID in Session (TempData is consumed on first read and unreliable across redirects)
            Session["ActiveQuizID"] = quiz.QuizID;
            return View(viewModel);
        }

        // ─── STUDENT: receive serialised answers, store in session, redirect to review

        [HttpPost]
        [Authorize(Roles = "User")]
        public ActionResult SubmitQuiz(string submittedAnswersJson)
        {
            try
            {
                var answers = JsonConvert.DeserializeObject<Dictionary<Guid, string>>(submittedAnswersJson);
                Session["SubmittedAnswers"] = answers;

                var quizId = Session["ActiveQuizID"] as Guid?;
                if (quizId == null) return RedirectToAction("Index", "Students");

                return RedirectToAction("Review", new { id = quizId.Value });
            }
            catch
            {
                return RedirectToAction("Index", "Students");
            }
        }

        // ─── STUDENT: review answers before final submission ─────────────────────

        [Authorize(Roles = "User")]
        public ActionResult Review(Guid id)
        {
            var quiz = db.Quizzes.Include(q => q.Questions).FirstOrDefault(q => q.QuizID == id);
            if (quiz == null) return HttpNotFound();

            ViewBag.Answers = Session["SubmittedAnswers"] as Dictionary<Guid, string> ?? new Dictionary<Guid, string>();
            return View(quiz);
        }

        // ─── STUDENT: confirm – mark and save attempt ────────────────────────────

        [HttpPost]
        [Authorize(Roles = "User")]
        public ActionResult MarkQuiz()
        {
            var quizId = Session["ActiveQuizID"] as Guid?;
            if (quizId == null) return RedirectToAction("Index", "Students");

            var quiz = db.Quizzes.Include(q => q.Questions).FirstOrDefault(q => q.QuizID == quizId.Value);
            if (quiz == null) return HttpNotFound();

            var selectedAnswers = Session["SubmittedAnswers"] as Dictionary<Guid, string> ?? new Dictionary<Guid, string>();
            int totalScore = 0;

            foreach (var question in quiz.Questions)
            {
                if (selectedAnswers.TryGetValue(question.QuestionID, out string chosen)
                    && chosen == question.CorrectAnswer)
                {
                    totalScore += question.Weighting;
                }
            }

            var studentId = User.Identity.GetUserId();
            db.QuizAttempts.Add(new QuizAttempt
            {
                QuizAttemptID = Guid.NewGuid(),
                QuizID        = quizId.Value,
                StudentID     = studentId,
                AttemptDate   = DateTime.Now,
                MarkObtained  = totalScore
            });
            db.SaveChanges();

            // Clean up session
            Session.Remove("ActiveQuizID");
            Session.Remove("SubmittedAnswers");

            return RedirectToAction("QuizSubmitted");
        }

        [Authorize(Roles = "User")]
        public ActionResult QuizSubmitted()
        {
            return View();
        }

        // ─── TEACHER: view all student attempts for a quiz ───────────────────────

        [Authorize(Roles = "Teacher")]
        public ActionResult QuizResults(Guid QuizID)
        {
            var quiz = db.Quizzes
                         .Include(q => q.Questions)
                         .Include(q => q.Course)
                         .FirstOrDefault(q => q.QuizID == QuizID);
            if (quiz == null) return HttpNotFound();

            var teacherId = User.Identity.GetUserId();
            if (quiz.Course.TeacherID != teacherId)
                return new HttpStatusCodeResult(HttpStatusCode.Forbidden);

            var attempts = db.QuizAttempts
                             .Include(a => a.Student)
                             .Where(a => a.QuizID == QuizID)
                             .OrderByDescending(a => a.AttemptDate)
                             .ToList();

            int maxPossible = quiz.Questions.Sum(q => q.Weighting);
            ViewBag.MaxPossible = maxPossible;
            ViewBag.Quiz        = quiz;

            return View(attempts);
        }

        // ─── TEACHER: review one student's attempt ───────────────────────────────

        [Authorize(Roles = "Teacher")]
        public ActionResult ReviewAttempt(Guid attemptId)
        {
            var attempt = db.QuizAttempts
                            .Include(a => a.Quiz.Questions)
                            .Include(a => a.Student)
                            .FirstOrDefault(a => a.QuizAttemptID == attemptId);
            if (attempt == null) return HttpNotFound();

            return View(attempt);
        }

        // ─── TEACHER: add questions to a quiz ────────────────────────────────────

        [Authorize(Roles = "Teacher")]
        public ActionResult AddQuestions(Guid QuizID)
        {
            var quiz = db.Quizzes.Find(QuizID);
            if (quiz == null) return HttpNotFound();
            return View(quiz);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Teacher")]
        public ActionResult AddQuestions(Guid QuizID, List<Question> questions)
        {
            if (questions == null || !questions.Any())
                return RedirectToAction("Details", new { id = QuizID });

            foreach (var q in questions)
            {
                q.QuestionID = Guid.NewGuid();
                q.QuizID     = QuizID;
                db.Questions.Add(q);
            }
            db.SaveChanges();
            return RedirectToAction("Details", new { id = QuizID });
        }

        // ─── TEACHER: CRUD ────────────────────────────────────────────────────────

        [Authorize(Roles = "Teacher")]
        public ActionResult Index()
        {
            var teacherId = User.Identity.GetUserId();
            var quizzes   = db.Quizzes
                              .Include(q => q.Course)
                              .Where(q => q.Course.TeacherID == teacherId)
                              .OrderByDescending(q => q.QuizDate)
                              .ToList();
            return View(quizzes);
        }

        public ActionResult Details(Guid? id)
        {
            if (id == null) return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            var quiz = db.Quizzes.Include(q => q.Questions).FirstOrDefault(q => q.QuizID == id);
            if (quiz == null) return HttpNotFound();
            return View(quiz);
        }

        [Authorize(Roles = "Teacher")]
        public ActionResult Create()
        {
            var teacherId            = User.Identity.GetUserId();
            ViewBag.Courses          = db.Courses.Where(c => c.TeacherID == teacherId).ToList();
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Teacher")]
        public ActionResult Create([Bind(Include = "QuizDescription,QuizMaxMark,QuizDate,QuizStart,QuizEnd,MaxAttempts,Status,Duration,CourseID")] Quiz quiz)
        {
            var teacherId   = User.Identity.GetUserId();
            var teacher     = db.Teachers.FirstOrDefault(t => t.TeacherID == teacherId);
            quiz.QuizID     = Guid.NewGuid();
            quiz.DateCreated = DateTime.Now;
            quiz.TeacherID  = teacher?.TeacherID;

            if (ModelState.IsValid)
            {
                db.Quizzes.Add(quiz);
                db.SaveChanges();
                return RedirectToAction("AddQuestions", new { QuizID = quiz.QuizID });
            }

            ViewBag.Courses = db.Courses.Where(c => c.TeacherID == teacherId).ToList();
            return View(quiz);
        }

        [Authorize(Roles = "Teacher")]
        public ActionResult Edit(Guid? id)
        {
            if (id == null) return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            var quiz = db.Quizzes.Find(id);
            if (quiz == null) return HttpNotFound();

            var teacherId = User.Identity.GetUserId();
            ViewBag.Courses = db.Courses.Where(c => c.TeacherID == teacherId).ToList();
            return View(quiz);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Teacher")]
        public ActionResult Edit([Bind(Include = "QuizID,QuizDescription,QuizMaxMark,QuizDate,QuizStart,QuizEnd,DateCreated,MaxAttempts,Status,Duration,TeacherID,CourseID")] Quiz quiz)
        {
            if (ModelState.IsValid)
            {
                db.Entry(quiz).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            var teacherId   = User.Identity.GetUserId();
            ViewBag.Courses = db.Courses.Where(c => c.TeacherID == teacherId).ToList();
            return View(quiz);
        }

        [Authorize(Roles = "Teacher")]
        public ActionResult Delete(Guid? id)
        {
            if (id == null) return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            var quiz = db.Quizzes.Find(id);
            if (quiz == null) return HttpNotFound();
            return View(quiz);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Teacher")]
        public ActionResult DeleteConfirmed(Guid id)
        {
            // Cascade: remove questions and attempts before removing the quiz
            var questions = db.Questions.Where(q => q.QuizID == id).ToList();
            db.Questions.RemoveRange(questions);

            var attempts = db.QuizAttempts.Where(a => a.QuizID == id).ToList();
            db.QuizAttempts.RemoveRange(attempts);

            var quiz = db.Quizzes.Find(id);
            db.Quizzes.Remove(quiz);
            db.SaveChanges();
            return RedirectToAction("Index");
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) db.Dispose();
            base.Dispose(disposing);
        }
    }
}

using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using System.Windows.Forms.Design;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels;
using LearniVerseNew.Models.ApplicationModels.ViewModels;
using Microsoft.AspNet.Identity;
using Newtonsoft.Json;

namespace LearniVerseNew.Controllers
{
    public class StudentsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        [Authorize(Roles = "User")]
        public ActionResult Home()
        {
            string id = User.Identity.GetUserId();

            var student = db.Students.Include(s => s.Enrollments.Select(e => e.Courses))
                                     .Include(f => f.Faculty)
                                     .Include(q => q.Qualification)
                                     .Include(q => q.QuizAttempts.Select(a => a.Quiz))
                                     .Include(sc => sc.StudySessions.Select(ss => ss.TaskItems))
                                     .FirstOrDefault(s => s.StudentID == id);

            if (student != null)
            {
                // Group quiz attempts by course and calculate the highest mark for each quiz
                var courseHighestMarks = student.QuizAttempts
                    .GroupBy(a => a.Quiz.CourseID)
                    .Select(group => new
                    {
                        CourseID = group.Key,
                        HighestMark = group.Max(a => a.MarkObtained)
                    })
                    .ToList();

                // Group study sessions by date and count the completed sessions
                var completedStudySessions = student.StudySessions
                    .Where(session => session.TaskItems.All(task => task.IsComplete))
                    .GroupBy(session => session.SessionDate.Date)
                    .Select(group => new
                    {
                        Date = group.Key,
                        Count = group.Count()
                    })
                    .ToList();

                ViewBag.CourseHighestMarks = courseHighestMarks;
                ViewBag.CompletedStudySessions = JsonConvert.SerializeObject(completedStudySessions);

                return View(student);
            }

            return RedirectToAction("Account", "Login");
        }

        public ActionResult GetEvents()
        {
            // Retrieve the student ID from the session
            var id = User.Identity.GetUserId();

            if (!string.IsNullOrEmpty(id))
            {
                using (var context = new ApplicationDbContext()) // Replace 'YourDbContextName' with the actual name of your DbContext class
                {
                    // Directly fetch the student along with their related data
                    var student = context.Students
                                 .Include(s => s.Enrollments.Select(e => e.Courses.Select(c => c.Quizzes)))
                                 .FirstOrDefault(s => s.StudentID == id);



                    if (student != null)
                    {
                        List<Quiz> allQuizzes = new List<Quiz>();
                        List<Submission> allSubmissions = new List<Submission>();


                        foreach (var enrollment in student.Enrollments)
                        {
                            // Access courses for the current enrollment
                            var courses = enrollment.Courses;

                            // Iterate over each course to collect quizzes
                            foreach (var course in courses)
                            {
                                var quizzes = course.Quizzes;

                                foreach (var quiz in quizzes)
                                {
                                    allQuizzes.Add(quiz);
                                }
                            }
                            // Serialize the aggregated quizzes for sending to the calendar
                            
                        };
                        var settings = new JsonSerializerSettings
                        {
                            ReferenceLoopHandling = ReferenceLoopHandling.Ignore
                        };

                        // Serialize the aggregated quizzes for sending to the calendar
                        var events = allQuizzes.Select(quiz => new
                        {
                            title = quiz.QuizDescription,
                            date = quiz.QuizDate.ToString("yyyy-MM-dd"), // Only date portion
                            end = quiz.QuizDate.Add(quiz.QuizEnd).ToString("yyyy-MM-ddTHH:mm:ss")
                            // You can add more properties here if needed
                        });

                        // Return events as JSON
                        return Json(events, JsonRequestBehavior.AllowGet);

                    }
                    else
                    {
                        // Handle the case where the student is not found
                        return HttpNotFound(); // Corrected to use the method for returning a 404 Not Found status code
                    }
                }
            }
            else
            {
                // Handle the case where the student ID is not available in the session
                return HttpNotFound(); // Or return an appropriate status code
            }
        }

        [Authorize(Roles = "User")]
        public ActionResult ProgressCenter()
        {
            var studentId = User.Identity.GetUserId();
            var student = db.Students
                .Include(s => s.Enrollments.Select(e => e.Courses))
                .FirstOrDefault(s => s.StudentID == studentId);

            if (student == null) return HttpNotFound();

            var model = new ProgressCenterViewModel
            {
                Courses = student.Enrollments.SelectMany(e => e.Courses).ToList()
            };

            return View(model);
        }

        // Changed from POST to GET so a course progress page can be linked directly
        [Authorize(Roles = "User")]
        public ActionResult ViewProgress(string courseId)
        {
            if (string.IsNullOrEmpty(courseId))
                return RedirectToAction("ProgressCenter");

            var studentId = User.Identity.GetUserId();

            var course = db.Courses.Find(courseId);
            if (course == null) return HttpNotFound();

            var quizAttempts = db.QuizAttempts
                .Include(qa => qa.Quiz)
                .Where(qa => qa.StudentID == studentId && qa.Quiz.CourseID == courseId)
                .OrderBy(qa => qa.AttemptDate)
                .ToList();

            var submissions = db.Submissions
                .Include(s => s.Assignment)
                .Where(s => s.StudentID == studentId && s.Assignment.CourseID == courseId)
                .ToList();

            // Per-quiz: take the best attempt only
            double quizPercent = 0;
            var quizGroups = quizAttempts.GroupBy(a => a.QuizID).ToList();
            if (quizGroups.Any())
            {
                // Sum of (best mark / max mark) per quiz, averaged across all quizzes
                double quizScoreSum = 0;
                foreach (var grp in quizGroups)
                {
                    var bestMark   = grp.Max(a => a.MarkObtained);
                    var maxPossible = grp.First().Quiz.QuizMaxMark;
                    if (maxPossible > 0)
                        quizScoreSum += (double)bestMark / maxPossible * 100;
                }
                quizPercent = quizScoreSum / quizGroups.Count;
            }

            // Assignments: use the marked submissions
            double assignmentPercent = 0;
            var gradedSubmissions = submissions.Where(s => s.Mark.HasValue).ToList();
            if (gradedSubmissions.Any())
            {
                double assignSum = 0;
                foreach (var sub in gradedSubmissions)
                {
                    int maxMark = sub.Assignment.MaxMark ?? 100;
                    if (maxMark > 0)
                        assignSum += (double)sub.Mark.Value / maxMark * 100;
                }
                assignmentPercent = assignSum / gradedSubmissions.Count;
            }

            // Stored final mark (teacher-published) takes precedence; otherwise compute a live estimate
            var stored = db.StudentFinalMarks
                           .FirstOrDefault(fm => fm.StudentID == studentId && fm.CourseID == courseId);

            double? finalMark = stored?.FinalMark;
            if (finalMark == null && (quizAttempts.Any() || gradedSubmissions.Any()))
            {
                // Default 50 / 50 weighting when teacher hasn't set one yet
                int parts = 0;
                double sum = 0;
                if (quizAttempts.Any())   { sum += quizPercent;       parts++; }
                if (gradedSubmissions.Any()) { sum += assignmentPercent; parts++; }
                finalMark = parts > 0 ? sum / parts : 0;
            }

            var model = new ProgressViewModel
            {
                Coursename            = course.CourseName,
                QuizAttempts          = quizAttempts,
                HighestMark           = quizAttempts.Any() ? quizAttempts.Max(a => a.MarkObtained) : 0,
                AverageMark           = quizAttempts.Any() ? quizAttempts.Average(a => a.MarkObtained) : 0,
                Submissions           = submissions,
                AverageSubmissionMark = gradedSubmissions.Any() ? gradedSubmissions.Average(s => (double)s.Mark.Value) : (double?)null,
                QuizPercent           = quizPercent,
                AssignmentPercent     = assignmentPercent,
                FinalMark             = finalMark
            };

            return View("QuizProgress", model);
        }

        [Authorize(Roles = "User")]
        public ActionResult ViewProgressReport()
        {
            var studentId = User.Identity.GetUserId();

            var student = db.Students
                            .Include(s => s.QuizAttempts.Select(qa => qa.Quiz.Course))
                            .FirstOrDefault(s => s.StudentID == studentId);

            if (student == null) return HttpNotFound();

            var coursesQuizAttempts = student.QuizAttempts
                                              .GroupBy(qa => qa.Quiz.Course)
                                              .Select(g => new CourseQuizAttempts
                                              {
                                                  CourseName   = g.Key.CourseName,
                                                  QuizAttempts = g.ToList()
                                              })
                                              .ToList();

            return View("ProgressReport", new ProgressViewModel { CoursesQuizAttempts = coursesQuizAttempts });
        }


        [Authorize(Roles = "User")]
        public ActionResult MyCourses(string id)
        {
            id = User.Identity.Name;

            var student = db.Students.Include(s => s.Enrollments.Select(e => e.Courses))
                                            .FirstOrDefault(s => s.StudentEmail == id);

            if (student != null)
            {
                
                return View(student);
            }

            return View("Error");

        }

        // GET: Students
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> Index(string searchName)
        {
            IQueryable<Student> students = db.Students;

            if (!string.IsNullOrEmpty(searchName))
            {
                students = students.Where(s => s.StudentFirstName.Contains(searchName) || s.StudentLastName.Contains(searchName));
            }


            return View(await students.ToListAsync());
        }

        // GET: Students/Details/5
        public ActionResult Details(string id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Student student = db.Students.Find(id);
            if (student == null)
            {
                return HttpNotFound();
            }
            return View(student);
        }

        public ActionResult Edit(string id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Student student = db.Students.Find(id);
            if (student == null)
            {
                return HttpNotFound();
            }
            ViewBag.FacultyID = new SelectList(db.Faculties, "FacultyID", "FacultyName", student.FacultyID);
            ViewBag.QualificationID = new SelectList(db.Qualifications, "QualificationID", "Name", student.QualificationID);
            return View(student);
        }

        // POST: Students/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit([Bind(Include = "StudentID,StudentFirstName,StudentLastName,StudentEmail,PhoneNumber,Gender,DOB,FacultyID,QualificationID")] Student student)
        {
            if (ModelState.IsValid)
            {
                db.Entry(student).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            ViewBag.FacultyID = new SelectList(db.Faculties, "FacultyID", "FacultyName", student.FacultyID);
            ViewBag.QualificationID = new SelectList(db.Qualifications, "QualificationID", "Name", student.QualificationID);
            return View(student);
        }

        // GET: Students/Delete/5
        public ActionResult Delete(string id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Student student = db.Students.Find(id);
            if (student == null)
            {
                return HttpNotFound();
            }
            return View(student);
        }

        // POST: Students/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(string id)
        {
            Student student = db.Students.Find(id);
            db.Students.Remove(student);
            db.SaveChanges();
            return RedirectToAction("Index");
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}

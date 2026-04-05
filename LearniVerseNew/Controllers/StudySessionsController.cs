using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels.ViewModels;
using LearniVerseNew.Models.ApplicationModels;

namespace LearniVerseNew.Controllers
{
    [Authorize(Roles = "User")]
    public class StudySessionsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        public ActionResult CreateSession(string studentId)
        {
            string email = User.Identity.Name;
            if (string.IsNullOrEmpty(studentId))
            {
                return RedirectToAction("Index", "Home");
            }

            var student = db.Students.FirstOrDefault(s => s.StudentEmail == email);

            var studySession = new StudySession
            {
                StudySessionID = Guid.NewGuid(),
                SessionDate = DateTime.Now,
                StudentID = student.StudentID,
                Student =student,
                TaskItems = new List<TaskItem>()
            };

            db.StudySessions.Add(studySession);
            db.SaveChanges();

            TempData["StudySessionID"] = studySession.StudySessionID;

            var viewModel = new StudySessionViewModel
            {
                StudySessionID = studySession.StudySessionID,
                SessionDate = studySession.SessionDate,
                StudentID = studySession.StudentID,
                TaskItems = studySession.TaskItems.ToList()
            };

            return View("StudySession", viewModel);
        }
        [HttpPost]
        public ActionResult CompleteSession(StudySessionViewModel viewModel)
        {
            if (ModelState.IsValid)
            {
                if (TempData["StudySessionID"] != null)
                {
                    var studySessionID = (Guid)TempData["StudySessionID"];
                    var studySession = db.StudySessions.Find(studySessionID);
                    if (studySession != null)
                    {
                        studySession.TaskItems.Clear();
                        foreach (var task in viewModel.TaskItems)
                        {
                            studySession.TaskItems.Add(new TaskItem
                            {
                                TaskID = Guid.NewGuid(),
                                Title = task.Title,
                                Description = task.Description,
                                IsComplete = task.IsComplete,
                                StudySessionID = studySession.StudySessionID
                            });
                        }

                        db.SaveChanges();
                        return Json(new { success = true });
                    }
                }
            }

            return Json(new { success = false });
        }

        public ActionResult Index()
        {
            var studySessions = db.StudySessions.Include(ss => ss.Student).ToList();
            return View(studySessions);
        }

        public ActionResult Create()
        {
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName");
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(StudySession studySession)
        {
            if (ModelState.IsValid)
            {
                studySession.StudySessionID = Guid.NewGuid();
                db.StudySessions.Add(studySession);
                db.SaveChanges();
                return RedirectToAction("Index");
            }

            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName", studySession.StudentID);
            return View(studySession);
        }

        public ActionResult Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            StudySession studySession = db.StudySessions.Find(id);
            if (studySession == null)
            {
                return HttpNotFound();
            }
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName", studySession.StudentID);
            return View(studySession);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(StudySession studySession)
        {
            if (ModelState.IsValid)
            {
                db.Entry(studySession).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName", studySession.StudentID);
            return View(studySession);
        }

        public ActionResult Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            StudySession studySession = db.StudySessions.Find(id);
            if (studySession == null)
            {
                return HttpNotFound();
            }
            return View(studySession);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(Guid id)
        {
            StudySession studySession = db.StudySessions.Find(id);
            db.StudySessions.Remove(studySession);
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

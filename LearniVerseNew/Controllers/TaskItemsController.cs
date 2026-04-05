using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels;

namespace LearniVerseNew.Controllers
{
    public class TaskItemsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        public ActionResult Index(Guid? studySessionId)
        {
            if (studySessionId == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            var taskItems = db.TaskItems.Where(ti => ti.StudySessionID == studySessionId).ToList();
            return View(taskItems);
        }

        public ActionResult Create(Guid? studySessionId)
        {
            if (studySessionId == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            ViewBag.StudySessionID = studySessionId;
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(TaskItem taskItem)
        {
            if (ModelState.IsValid)
            {
                taskItem.TaskID = Guid.NewGuid();
                db.TaskItems.Add(taskItem);
                db.SaveChanges();
                return RedirectToAction("Index", new { studySessionId = taskItem.StudySessionID });
            }

            ViewBag.StudySessionID = taskItem.StudySessionID;
            return View(taskItem);
        }

        public ActionResult Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            TaskItem taskItem = db.TaskItems.Find(id);
            if (taskItem == null)
            {
                return HttpNotFound();
            }
            ViewBag.StudySessionID = taskItem.StudySessionID;
            return View(taskItem);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(TaskItem taskItem)
        {
            if (ModelState.IsValid)
            {
                db.Entry(taskItem).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index", new { studySessionId = taskItem.StudySessionID });
            }
            ViewBag.StudySessionID = taskItem.StudySessionID;
            return View(taskItem);
        }

        public ActionResult Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            TaskItem taskItem = db.TaskItems.Find(id);
            if (taskItem == null)
            {
                return HttpNotFound();
            }
            return View(taskItem);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(Guid id)
        {
            TaskItem taskItem = db.TaskItems.Find(id);
            var studySessionId = taskItem.StudySessionID;
            db.TaskItems.Remove(taskItem);
            db.SaveChanges();
            return RedirectToAction("Index", new { studySessionId = studySessionId });
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


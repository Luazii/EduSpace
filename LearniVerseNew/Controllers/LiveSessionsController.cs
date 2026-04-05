using System;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels;
using Microsoft.AspNet.Identity;

namespace LearniVerseNew.Controllers
{
    public class LiveSessionsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        // ─── TEACHER: list sessions for a course ─────────────────────────────────

        [Authorize(Roles = "Teacher")]
        public ActionResult Index(string courseId)
        {
            if (string.IsNullOrEmpty(courseId))
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);

            var teacherId = User.Identity.GetUserId();
            var course    = db.Courses.Find(courseId);
            if (course == null || course.TeacherID != teacherId)
                return new HttpStatusCodeResult(HttpStatusCode.Forbidden);

            var sessions = db.LiveSessions
                             .Where(s => s.CourseID == courseId)
                             .OrderByDescending(s => s.StartTime)
                             .ToList();

            ViewBag.Course = course;
            return View(sessions);
        }

        // ─── TEACHER: create a session ────────────────────────────────────────────

        [Authorize(Roles = "Teacher")]
        public ActionResult Create(string courseId)
        {
            if (string.IsNullOrEmpty(courseId))
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);

            var teacherId = User.Identity.GetUserId();
            var course    = db.Courses.Find(courseId);
            if (course == null || course.TeacherID != teacherId)
                return new HttpStatusCodeResult(HttpStatusCode.Forbidden);

            ViewBag.CourseID   = courseId;
            ViewBag.CourseName = course.CourseName;
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult> Create(
            [Bind(Include = "Title,MeetingUrl,StartTime,EndTime,CourseID")] LiveSession session)
        {
            if (session.EndTime <= session.StartTime)
                ModelState.AddModelError("EndTime", "End time must be after start time.");

            if (ModelState.IsValid)
            {
                var teacherId       = User.Identity.GetUserId();
                session.LiveSessionID = Guid.NewGuid();
                session.TeacherID   = teacherId;
                session.Status      = "Scheduled";
                session.CreatedAt   = DateTime.Now;

                db.LiveSessions.Add(session);
                await db.SaveChangesAsync();

                return RedirectToAction("Index", new { courseId = session.CourseID });
            }

            var course = db.Courses.Find(session.CourseID);
            ViewBag.CourseID   = session.CourseID;
            ViewBag.CourseName = course?.CourseName;
            return View(session);
        }

        // ─── TEACHER: delete a session ────────────────────────────────────────────

        [Authorize(Roles = "Teacher")]
        public ActionResult Delete(Guid id)
        {
            var session = db.LiveSessions.Include(s => s.Course).FirstOrDefault(s => s.LiveSessionID == id);
            if (session == null) return HttpNotFound();
            return View(session);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult> DeleteConfirmed(Guid id)
        {
            var session = db.LiveSessions.Find(id);
            if (session == null) return HttpNotFound();

            var courseId = session.CourseID;
            db.LiveSessions.Remove(session);
            await db.SaveChangesAsync();

            return RedirectToAction("Index", new { courseId });
        }

        // ─── TEACHER: mark a session as live / completed ──────────────────────────

        [HttpPost]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult> UpdateStatus(Guid id, string status)
        {
            var session = db.LiveSessions.Find(id);
            if (session == null) return HttpNotFound();

            session.Status = status; // "Live" or "Completed"
            db.Entry(session).State = EntityState.Modified;
            await db.SaveChangesAsync();

            return RedirectToAction("Index", new { courseId = session.CourseID });
        }

        // ─── STUDENT: join a live class ───────────────────────────────────────────

        [Authorize(Roles = "User")]
        public ActionResult Join(Guid id)
        {
            var session = db.LiveSessions.Include(s => s.Course).FirstOrDefault(s => s.LiveSessionID == id);
            if (session == null) return HttpNotFound();

            // Redirect to the external meeting URL
            return Redirect(session.MeetingUrl);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) db.Dispose();
            base.Dispose(disposing);
        }
    }
}

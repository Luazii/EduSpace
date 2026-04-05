using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels;
using LearniVerseNew.Models.ApplicationModels.ViewModels;

namespace LearniVerseNew.Controllers
{
    public class CoursesController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        public async Task<ActionResult> Classroom(string courseId)
        {
            // Get the student's email
            string email = User.Identity.Name;

            // Find the course with the provided courseId
            var course = await db.Courses.FirstOrDefaultAsync(c => c.CourseID == courseId);

            if (course != null)
            {
                // Retrieve all the files associated with the selected course
                var courseFiles = await db.Resources.Where(f => f.CourseID == courseId).ToListAsync();

                DateTime startOfToday = DateTime.Today;
                DateTime endOfToday = startOfToday.AddDays(1);

                var assignments = await db.Assignments
                                          .Where(a => a.CourseID == course.CourseID && a.Deadline >= DateTime.Now)
                                          .ToListAsync();

                var quizzes = await db.Quizzes
                                      .Where(q => q.CourseID == courseId && q.Status == "Published")
                                      .ToListAsync();

                var liveSessions = await db.LiveSessions
                                           .Where(s => s.CourseID == courseId)
                                           .OrderByDescending(s => s.StartTime)
                                           .ToListAsync();

                var model = new ClassroomViewModel
                {
                    Course       = course,
                    Resources    = courseFiles,
                    Quizzes      = quizzes,
                    Assignments  = assignments,
                    LiveSessions = liveSessions
                };

                return View(model);
            }

            return View();
        }

        // GET: Courses
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> Index(string searchDepartment, string searchCourseName, string searchCourseCode)
        {
            var courses = db.Courses.Include(c => c.Teacher);
            var departments = courses.Select(c => c.Department).Distinct().ToList();
            ViewBag.Departments = departments.Select(d => new SelectListItem { Text = d, Value = d });

            // Apply filters based on search criteria
            if (!string.IsNullOrEmpty(searchDepartment))
            {
                string searchDeptLower = searchDepartment.ToLower();
                courses = courses.Where(c => c.Department.ToLower().Contains(searchDeptLower));
            }

            if (!string.IsNullOrEmpty(searchCourseName))
            {
                string searchCourseNameLower = searchCourseName.ToLower();
                courses = courses.Where(c => c.CourseName.ToLower().Contains(searchCourseNameLower));
            }

            if (!string.IsNullOrEmpty(searchCourseCode))
            {
                string searchCourseCodeLower = searchCourseCode.ToLower();
                courses = courses.Where(c => c.CourseID.ToLower().Contains(searchCourseCodeLower));
            }

            return View(await courses.ToListAsync());
        }

        // GET: Courses/Details/5
        public ActionResult Details(string id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Course course = db.Courses.Find(id);
            if (course == null)
            {
                return HttpNotFound();
            }
            return View(course);
        }

        // GET: Courses/Create
        public ActionResult Create()
        {
            ViewBag.QualificationID = new SelectList(db.Qualifications, "QualificationID", "Name");
            ViewBag.TeacherID = new SelectList(db.Teachers, "TeacherID", "TeacherFirstName");
            return View();
        }

        // POST: Courses/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create([Bind(Include = "CourseID,CourseName,Description,Semester,Department,Price,TeacherID,QualificationID")] Course course)
        {
            if (ModelState.IsValid)
            {
                db.Courses.Add(course);
                db.SaveChanges();
                return RedirectToAction("Index");
            }

            ViewBag.QualificationID = new SelectList(db.Qualifications, "QualificationID", "Name", course.QualificationID);
            ViewBag.TeacherID = new SelectList(db.Teachers, "TeacherID", "TeacherFirstName", course.TeacherID);
            return View(course);
        }

        // GET: Courses/Edit/5
        public ActionResult Edit(string id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Course course = db.Courses.Find(id);
            if (course == null)
            {
                return HttpNotFound();
            }
            ViewBag.QualificationID = new SelectList(db.Qualifications, "QualificationID", "Name", course.QualificationID);
            ViewBag.TeacherID = new SelectList(db.Teachers, "TeacherID", "TeacherFirstName", course.TeacherID);
            return View(course);
        }

        // POST: Courses/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit([Bind(Include = "CourseID,CourseName,Description,Semester,Department,Price,TeacherID,QualificationID")] Course course)
        {
            if (ModelState.IsValid)
            {
                db.Entry(course).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            ViewBag.QualificationID = new SelectList(db.Qualifications, "QualificationID", "Name", course.QualificationID);
            ViewBag.TeacherID = new SelectList(db.Teachers, "TeacherID", "TeacherFirstName", course.TeacherID);
            return View(course);
        }

        // GET: Courses/Delete/5
        public ActionResult Delete(string id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Course course = db.Courses.Find(id);
            if (course == null)
            {
                return HttpNotFound();
            }
            return View(course);
        }

        // POST: Courses/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(string id)
        {
            Course course = db.Courses.Find(id);
            db.Courses.Remove(course);
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

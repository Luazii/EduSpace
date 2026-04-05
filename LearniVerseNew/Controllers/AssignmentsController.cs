using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels;
using LearniVerseNew.Models.ApplicationModels.ViewModels;
using LearniVerseNew.Models.Helpers;
using Microsoft.AspNet.Identity;

namespace LearniVerseNew.Controllers
{
    
    public class AssignmentsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        [Authorize(Roles = "User")]
        [HttpGet]
        public ActionResult SubmitAssignment(Guid assignmentId)
        {
            var assignment = db.Assignments.Find(assignmentId);
            if (assignment == null)
            {
                return HttpNotFound();
            }

            var model = new SubmitAssignmentViewMode
            {
                AssignmentID = assignment.AssignmentID,
                Title = assignment.Title,
                Description = assignment.Description
            };

            return View(model);
        }

        [Authorize(Roles = "User")]
        [HttpPost]
        public async Task<ActionResult> SubmitAssignment(SubmitAssignmentViewMode model, HttpPostedFileBase submissionFile)
        {
            if (ModelState.IsValid && submissionFile != null && submissionFile.ContentLength > 0)
            {
                var studentId = User.Identity.GetUserId();
                var fileName = Path.GetFileName(submissionFile.FileName);
                var blobHelper = new BlobHelper();

                using (var stream = submissionFile.InputStream)
                {
                    var result = await blobHelper.UploadSubmissionAsync(model.AssignmentID.ToString(), studentId, fileName, stream);

                    if (result.Success)
                    {
                        var submission = new Submission
                        {
                            SubmissionID = Guid.NewGuid(),
                            AssignmentID = model.AssignmentID,
                            StudentID = studentId,
                            FileName = fileName,
                            BlobUrl = result.Uri,
                            Mark = null 
                        };

                        db.Submissions.Add(submission);
                        await db.SaveChangesAsync();

                        
                        var assignment = await db.Assignments.FindAsync(model.AssignmentID);
                        if (assignment != null)
                        {
                            return RedirectToAction("Classroom", "Courses", new { courseId = assignment.CourseID });
                        }
                    }
                }
            }

            ModelState.AddModelError("", "File upload failed. Please try again.");
            return View(model);
        }


        public ActionResult MyAssignments()
        {
            var teacherId = User.Identity.GetUserId();
            var courses = db.Courses.Where(c => c.TeacherID == teacherId).ToList();

            var model = new AssignmentsViewModel
            {
                Courses = new SelectList(courses, "CourseID", "CourseName"),
                Assignments = new List<Assignment>() // Initialize with an empty list
            };

            return View(model);
        }

        // Action to fetch assignments based on the selected course
        [HttpPost]
        public ActionResult GetAssignments(AssignmentsViewModel model)
        {
            var teacherId = User.Identity.GetUserId();
            var assignments = db.Assignments
                                .Where(a => a.CourseID == model.SelectedCourseId && a.Course.TeacherID == teacherId)
                                .Include(a => a.Course)
                                .ToList();

            model.Courses = new SelectList(db.Courses.Where(c => c.TeacherID == teacherId), "CourseID", "CourseName");
            model.Assignments = assignments;

            return View("MyAssignments", model); // Return the same view with updated assignments
        }


        // Action to view submissions for an assignment
        public ActionResult ViewSubmissions(Guid assignmentId)
        {
            var assignment = db.Assignments.Include(a => a.Course)
                                            .FirstOrDefault(a => a.AssignmentID == assignmentId);
            if (assignment == null)
            {
                return HttpNotFound();
            }

            var submissions = db.Submissions.Where(s => s.AssignmentID == assignmentId).ToList();
            var model = new AssignmentSubmissionsViewModel
            {
                Assignment = assignment,
                Submissions = submissions
            };

            return View(model);
        }

        // Action to grade a submission
        [Authorize(Roles = "Teacher")]
        [HttpPost]
        public async Task<ActionResult> GradeSubmission(Guid submissionId, int mark, string feedback)
        {
            var submission = db.Submissions.Find(submissionId);
            if (submission == null)
            {
                return HttpNotFound();
            }

            submission.Mark      = mark;
            submission.Feedback  = feedback?.Trim();
            submission.GradedAt  = DateTime.Now;
            db.Entry(submission).State = EntityState.Modified;
            await db.SaveChangesAsync();

            return RedirectToAction("ViewSubmissions", new { assignmentId = submission.AssignmentID });
        }

        // Action to download all submissions for an assignment
        public async Task<ActionResult> DownloadAllSubmissions(Guid assignmentId)
        {
            try
            {
                BlobHelper blobHelper = new BlobHelper();

                var submissions = await blobHelper.DownloadAssignmentSubmissionsAsync(assignmentId.ToString());

                using (var memoryStream = new MemoryStream())
                {
                    using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
                    {
                        foreach (var submission in submissions)
                        {
                            var blobName = submission.Key;
                            var stream = submission.Value;

                            var entry = archive.CreateEntry(blobName, CompressionLevel.Fastest);

                            using (var entryStream = entry.Open())
                            {
                                // Ensure the stream position is at the beginning
                                stream.Seek(0, SeekOrigin.Begin);
                                await stream.CopyToAsync(entryStream);
                            }

                            // Ensure the stream is properly disposed
                            stream.Dispose();
                        }
                    }

                    // Ensure the memory stream is properly closed and converted to byte array
                    memoryStream.Seek(0, SeekOrigin.Begin);
                    var bytes = memoryStream.ToArray();

                    return File(bytes, "application/zip", $"Assignment_{assignmentId}_submissions.zip");
                }
            }
            catch (Exception ex)
            {
                // Handle any exceptions
                return Content($"Error: {ex.Message}");
            }
        }



        // GET: Assignments
        [Authorize(Roles = "Teacher")]
        public ActionResult Index()
        {
            var assignments = db.Assignments.Include(a => a.Course).Include(a => a.Teacher);
            return View(assignments.ToList());
        }

        // GET: Assignments/Details/5
        [Authorize(Roles = "Teacher")]
        public ActionResult Details(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Assignment assignment = db.Assignments.Find(id);
            if (assignment == null)
            {
                return HttpNotFound();
            }
            return View(assignment);
        }

        // GET: Assignments/Create
        [Authorize(Roles = "Teacher")]
        public ActionResult Create()
        {
            var teacherId = User.Identity.GetUserId();
            ViewBag.CourseID  = new SelectList(db.Courses.Where(c => c.TeacherID == teacherId), "CourseID", "CourseName");
            ViewBag.TeacherID = new SelectList(db.Teachers.Where(t => t.TeacherID == teacherId), "TeacherID", "TeacherFirstName");
            return View();
        }

        // POST: Assignments/Create
        [Authorize(Roles = "Teacher")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create([Bind(Include = "Title,Description,Deadline,MaxMark,CourseID,TeacherID")] Assignment assignment)
        {
            if (ModelState.IsValid)
            {
                assignment.AssignmentID = Guid.NewGuid();
                db.Assignments.Add(assignment);
                db.SaveChanges();
                return RedirectToAction("Index");
            }

            var teacherId = User.Identity.GetUserId();
            ViewBag.CourseID  = new SelectList(db.Courses.Where(c => c.TeacherID == teacherId), "CourseID", "CourseName", assignment.CourseID);
            ViewBag.TeacherID = new SelectList(db.Teachers.Where(t => t.TeacherID == teacherId), "TeacherID", "TeacherFirstName", assignment.TeacherID);
            return View(assignment);
        }

        // GET: Assignments/Edit/5
        [Authorize(Roles = "Teacher")]
        public ActionResult Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Assignment assignment = db.Assignments.Find(id);
            if (assignment == null)
            {
                return HttpNotFound();
            }
            ViewBag.CourseID = new SelectList(db.Courses, "CourseID", "CourseName", assignment.CourseID);
            ViewBag.TeacherID = new SelectList(db.Teachers, "TeacherID", "TeacherFirstName", assignment.TeacherID);
            return View(assignment);
        }

        // POST: Assignments/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [Authorize(Roles = "Teacher")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit([Bind(Include = "AssignmentID,Title,Description,Deadline,CourseID,TeacherID")] Assignment assignment)
        {
            if (ModelState.IsValid)
            {
                db.Entry(assignment).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            ViewBag.CourseID = new SelectList(db.Courses, "CourseID", "CourseName", assignment.CourseID);
            ViewBag.TeacherID = new SelectList(db.Teachers, "TeacherID", "TeacherFirstName", assignment.TeacherID);
            return View(assignment);
        }

        // GET: Assignments/Delete/5
        [Authorize(Roles = "Teacher")]
        public ActionResult Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Assignment assignment = db.Assignments.Find(id);
            if (assignment == null)
            {
                return HttpNotFound();
            }
            return View(assignment);
        }

        [Authorize(Roles = "Teacher")]
        // POST: Assignments/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(Guid id)
        {
            Assignment assignment = db.Assignments.Find(id);
            db.Assignments.Remove(assignment);
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

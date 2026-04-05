using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Web;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels.Trainer_Models;
using Microsoft.AspNet.Identity;
using System.Data.Entity.Core.Common.CommandTrees.ExpressionBuilder;

namespace LearniVerseNew.Controllers
{
    public class TrainingSessionsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        [Authorize(Roles = "User")]
        public async Task<ActionResult> MySessions()
        {
            // Get the logged-in student's ID
            var studentId = User.Identity.GetUserId();

            // Get today's date
            var today = DateTime.Today;

            // Fetch the training sessions for today that the student has joined
            var mySessionsToday = await db.TrainingSessions
                                          .Include(ts => ts.Trainer)
                                          .Where(ts => ts.Participants.Any(p => p.StudentID == studentId)
                                                       && DbFunctions.TruncateTime(ts.SessionDate) == today)
                                          .ToListAsync();

            return View(mySessionsToday);
        }

        [Authorize(Roles = "User")]
        public async Task<ActionResult> MyAllSessions()
        {
            // Get the logged-in student's ID
            var studentId = User.Identity.GetUserId();

            // Fetch all the training sessions that the student has joined in the past
            var allMySessions = await db.TrainingSessions
                                        .Include(ts => ts.Trainer)
                                        .Where(ts => ts.Participants.Any(p => p.StudentID == studentId))
                                        .ToListAsync();

            return View("MyAllSessions", allMySessions);
        }

        [HttpPost]
        [Authorize(Roles = "User")]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> CancelSession(Guid sessionId)
        {
            // Get the logged-in student's ID
            var studentId = User.Identity.GetUserId();

            // Find the session by ID and include the participants
            var session = await db.TrainingSessions.Include(ts => ts.Participants)
                                                   .FirstOrDefaultAsync(ts => ts.TrainingSessionID == sessionId);

            if (session == null)
            {
                return HttpNotFound();
            }

            // Check if the student is a participant of the session
            var student = session.Participants.FirstOrDefault(p => p.StudentID == studentId);
            if (student != null)
            {
                session.Participants.Remove(student); // Remove the student from the session
                db.Entry(session).State = EntityState.Modified;
                await db.SaveChangesAsync();

                TempData["SuccessMessage"] = "You have successfully canceled your participation in the session.";
            }
            else
            {
                TempData["ErrorMessage"] = "You are not enrolled in this session.";
            }

            return RedirectToAction("MySessions");
        }

        public async Task<ActionResult> AvailableSessions()
        {
            // Get today's date and current time
            var today = DateTime.Today;
            var nowTime = DateTime.Now.TimeOfDay;

            // Fetch all activities
            var activities = await db.TrainingActivities.Include(a => a.Trainer).ToListAsync();

            // Fetch all existing sessions for today
            var todaySessions = await db.TrainingSessions
                                         .Where(s => s.SessionDate == today)
                                         .ToListAsync();

            // For each activity, ensure there's a session for today, if not, create one
            foreach (var activity in activities)
            {
                // Check if there's already a session for this activity today and if the session time has passed
                if (!todaySessions.Any(s => s.SessionName == activity.ActivityName && s.SessionStart == activity.DefaultStartTime))
                {
                    // Check if the session start time is in the past
                    if (activity.DefaultStartTime > nowTime) // Only create sessions for future times
                    {
                        // Create a new session for today using the activity's defaults
                        TimeSpan defaultTime = activity.DefaultStartTime;

                        var newSession = new TrainingSession
                        {
                            TrainingSessionID = Guid.NewGuid(),
                            SessionName = activity.ActivityName,
                            SessionStart = activity.DefaultStartTime, // Today's date + default start time
                            Duration = activity.DafaultDuration,
                            SessionEnd = defaultTime.Add(TimeSpan.FromMinutes(Convert.ToDouble(activity.DafaultDuration))),
                            MaxParticipants = 10, // Set a default max participants
                            TrainerID = activity.TrainerID,
                            SessionDate = today
                        };

                        db.TrainingSessions.Add(newSession);
                        todaySessions.Add(newSession); // Add to the in-memory list
                    }
                }
            }

            // Save any new sessions created
            await db.SaveChangesAsync();

            // Return the available sessions (ensure only future sessions are shown)
            return View(todaySessions.Where(s => s.SessionEnd > nowTime).ToList());
        }


        [Authorize(Roles = "PersonalTrainer")]
        public async Task<ActionResult> PastSessions()
        {
            // Get the trainer's ID
            var trainerId = User.Identity.GetUserId();

            // Fetch all past training sessions grouped by date
            var pastSessions = await db.TrainingSessions
                                       .Where(ts => ts.TrainerID == trainerId && ts.SessionDate <= DateTime.Today)
                                       .OrderByDescending(ts => ts.SessionDate)
                                       .ToListAsync();

            return View(pastSessions);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> JoinSession(Guid sessionId)
        {
            // Get the logged-in student's ID
            string studentId = User.Identity.GetUserId();

            // Find the session by ID
            var session = await db.TrainingSessions
                                  .Include(s => s.Participants)
                                  .FirstOrDefaultAsync(s => s.TrainingSessionID == sessionId);

            if (session == null)
            {
                return HttpNotFound("Session not found.");
            }

            // Check if the session is already full
            if (session.Participants.Count >= session.MaxParticipants)
            {
                TempData["ErrorMessage"] = "Session is fully booked.";
                return RedirectToAction("AvailableSessions");
            }

            // Check if the student is already enrolled in the session
            if (session.Participants.Any(p => p.StudentID == studentId))
            {
                TempData["ErrorMessage"] = "You are already enrolled in this session.";
                return RedirectToAction("AvailableSessions");
            }

            // Retrieve the student
            var student = await db.Students.FindAsync(studentId);
            if (student == null)
            {
                return HttpNotFound("Student not found.");
            }

            // Add the student to the session's participant list
            session.Participants.Add(student);

            // Save changes
            await db.SaveChangesAsync();

            return RedirectToAction("MySessions");
        }


        // GET: TrainingSessions
        public async Task<ActionResult> Index()
        {
            var trainingSessions = db.TrainingSessions.Include(t => t.Trainer);
            return View(await trainingSessions.ToListAsync());
        }

        // GET: TrainingSessions/Details/5
        public async Task<ActionResult> Details(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            TrainingSession trainingSession = await db.TrainingSessions.FindAsync(id);
            if (trainingSession == null)
            {
                return HttpNotFound();
            }
            return View(trainingSession);
        }

        // GET: TrainingSessions/Create
        public ActionResult Create()
        {
            ViewBag.TrainerID = new SelectList(db.Trainers, "TrainerID", "FirstName");
            return View();
        }

        // POST: TrainingSessions/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Create([Bind(Include = "TrainingSessionID,SessionName,SessionStart,Duration,MaxParticipants,TrainerID")] TrainingSession trainingSession)
        {
            if (ModelState.IsValid)
            {
                trainingSession.TrainingSessionID = Guid.NewGuid();
                trainingSession.SessionEnd.Add(TimeSpan.FromMinutes(trainingSession.Duration));
                db.TrainingSessions.Add(trainingSession);
                await db.SaveChangesAsync();
                return RedirectToAction("Index");
            }

            ViewBag.TrainerID = new SelectList(db.Trainers, "TrainerID", "FirstName", trainingSession.TrainerID);
            return View(trainingSession);
        }

        // GET: TrainingSessions/Edit/5
        public async Task<ActionResult> Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            TrainingSession trainingSession = await db.TrainingSessions.FindAsync(id);
            if (trainingSession == null)
            {
                return HttpNotFound();
            }
            ViewBag.TrainerID = new SelectList(db.Trainers, "TrainerID", "FirstName", trainingSession.TrainerID);
            return View(trainingSession);
        }

        // POST: TrainingSessions/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Edit([Bind(Include = "TrainingSessionID,SessionName,SessionStart,Duration,MaxParticipants,TrainerID")] TrainingSession trainingSession)
        {
            if (ModelState.IsValid)
            {
                trainingSession.SessionEnd.Add(TimeSpan.FromMinutes(trainingSession.Duration));
                db.Entry(trainingSession).State = EntityState.Modified;
                await db.SaveChangesAsync();
                return RedirectToAction("Index");
            }
            ViewBag.TrainerID = new SelectList(db.Trainers, "TrainerID", "FirstName", trainingSession.TrainerID);
            return View(trainingSession);
        }

        // GET: TrainingSessions/Delete/5
        public async Task<ActionResult> Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            TrainingSession trainingSession = await db.TrainingSessions.FindAsync(id);
            if (trainingSession == null)
            {
                return HttpNotFound();
            }
            return View(trainingSession);
        }

        // POST: TrainingSessions/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> DeleteConfirmed(Guid id)
        {
            TrainingSession trainingSession = await db.TrainingSessions.FindAsync(id);
            db.TrainingSessions.Remove(trainingSession);
            await db.SaveChangesAsync();
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

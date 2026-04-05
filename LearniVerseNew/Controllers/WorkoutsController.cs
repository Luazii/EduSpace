using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels.Regimen_Models;
using LearniVerseNew.Models.Helpers;
using LearniVerseNew.Models.Helpers.Regimen_Models;
using Microsoft.AspNet.Identity;
using QRCoder;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;

namespace LearniVerseNew.Controllers
{
    public class WorkoutsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();
        private readonly ExerciseHelper _exerciseHelper;

        public WorkoutsController()
        {
            
            var client = new HttpClient();
            _exerciseHelper = new ExerciseHelper(client);
        }

        public async Task<ActionResult> WorkoutDashboard()
        {
            string studentId = User.Identity.GetUserId();

            // Fetch the student
            var student = await db.Students.FindAsync(studentId);

            if (student == null)
            {
                return View("Error");
            }

            // Fetch the latest regimen for the student
            var regimen = await db.Regimens
                .Where(r => r.StudentID == studentId)
                .OrderByDescending(r => r.DateCreated)
                .FirstOrDefaultAsync();

            var workoutGoals = await db.WorkoutGoals.Where(wg => wg.StudentID == studentId && wg.IsCompleted == false).ToListAsync();

            if (regimen != null)
            {
                // Fetch workouts associated with the latest regimen
                var workouts = await db.Workouts
                    .Include(w => w.Excercises)
                    .Where(w => w.RegimenID == regimen.RegimenID)
                    .ToListAsync();

                // Pass data to the view using ViewBag
                ViewBag.Student = student;
                ViewBag.Regimen = regimen;
                ViewBag.Workouts = workouts;
                ViewBag.WorkoutGoals = workoutGoals;

                return View();
            }

            // If no regimen is found, still return the view with an appropriate message or empty data
            ViewBag.Message = "No regimen found.";
            return View();
        }

        public ActionResult CreateRegimen()
        {
           return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> CreateRegimen(Regimen model)
        {
            string Id = User.Identity.GetUserId();

            var student = await db.Students.FindAsync(Id);

            if (student == null)
            {
                return View("Error");
            }

            if (ModelState.IsValid)
            {
                model.RegimenID = Guid.NewGuid();
                model.DateCreated = DateTime.Now.Date;
                model.StudentID = Id;
                model.Student = student;
                model.Workouts = new List <Workout>();
                db.Regimens.Add(model);

                await db.SaveChangesAsync();

                return RedirectToAction("WorkoutDashboard");
            }

            return View(model);
            
        }


        public async Task<ActionResult> CreateWorkout() 
        {
            string Id = User.Identity?.GetUserId();

            var student = await db.Students.FindAsync(Id);

            if (student == null)
            {
                return HttpNotFound();
            }


            var regimens = await db.Regimens
                           .Where(fr => fr.StudentID == Id)
                           .ToListAsync();


            if (regimens.Count  == 0) 
            {
                ViewBag.Message = "You haven't created a Workout Regimen yet...";
                return View("NoRegimen");
            }

            var latestRegimen = regimens.OrderByDescending(lr => lr.DateCreated).FirstOrDefault();

            
            return View(latestRegimen); 
        }

        [HttpPost]
        public async Task<ActionResult> SaveWorkout(WorkoutDTO workoutDTO)
        {
            string Id = User.Identity.GetUserId();

            if (workoutDTO == null || workoutDTO.Exercises == null || !workoutDTO.Exercises.Any())
            {
                return Json(new { success = false, message = "No data received" });
            }

            var student = await db.Students.Include(s => s.Regimens).FirstOrDefaultAsync(r => r.StudentID == Id);

            if (student == null)
            {
                return Json(new { success = false, message = "Student not found" });
            }

            var regimen = student.Regimens.OrderByDescending(s => s.DateCreated).FirstOrDefault();
           

            
                var workoutRecord = new Workout
                {
                    WorkoutID = Guid.NewGuid(),
                    Name = workoutDTO.Name,
                    DayOfWeek = workoutDTO.DayOfWeek,
                    RegimenID = regimen.RegimenID,
                    Regimen = regimen,
                    TimesTrained = 0, //Add API
                    Excercises = new List<Exercise>()
                };

                db.Workouts.Add(workoutRecord);
            

            foreach (var exerciseDTO in workoutDTO.Exercises)
            {
                var existingExercise = workoutRecord.Excercises
                    .FirstOrDefault(e => e.Name == exerciseDTO.Name);

                if (existingExercise == null)
                {
                    existingExercise = new Exercise
                    {
                        ExceciseID = Guid.NewGuid() , // assuming ExerciseID is provided by client
                        Name = exerciseDTO.Name,
                        WorkoutID = workoutRecord.WorkoutID,
                        Workout = workoutRecord,
                        Instructions = exerciseDTO.Instructions,
                        Difficulty = exerciseDTO.Difficulty,
                        Reps = exerciseDTO.Reps,
                        Sets = exerciseDTO.Sets,
                        TargetMuscle = exerciseDTO.Muscle,
                        Equipment = exerciseDTO.Equipment
                    };
                    workoutRecord.Excercises.Add(existingExercise);
                }
                else
                {
                    // Update existing exercise
                    existingExercise.Name = exerciseDTO.Name;
                    existingExercise.Reps = exerciseDTO.Reps;
                    existingExercise.Sets = exerciseDTO.Sets;
                }
            }

            // Save changes to the database
            await db.SaveChangesAsync();

            // Return a success response
            return Json(new { success = true });
        }

        [HttpPost]
        public async Task<ActionResult> Search(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return Json(new { success = false, message = "Query cannot be empty." });
            }

            try
            {
                var exercises = await _exerciseHelper.FindExercisesAsync(query);

                if (exercises != null && exercises.Count > 0)
                {
                    
                    return Json(new { success = true, data = new { Exercises = exercises } });
                }
                else
                {
                    return Json(new { success = false, message = "No exercises found." });
                }
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = $"Error: {ex.Message}" });
            }
        }

        public ActionResult GenerateAttendanceQRCode(string studentId, Guid workoutId)
        {
            // Create the URL for the TrackAttendance action
            string qrData = Url.Action("TrackAttendance", "Workouts", new { studentId = studentId, workoutId = workoutId }, protocol: Request.Url.Scheme);

            //For Testing Purposes Only
            //string qrData = $"https://learniverse.azurewebsites.net/Workouts/TrackAttendance?studentId={studentId}&workoutId={workoutId}"; //change this

            using (QRCodeGenerator qrGenerator = new QRCodeGenerator())
            {
                QRCodeData qrCodeData = qrGenerator.CreateQrCode(qrData, QRCodeGenerator.ECCLevel.Q);
                using (QRCode qrCode = new QRCode(qrCodeData))
                {
                    using (Bitmap qrCodeImage = qrCode.GetGraphic(20))
                    {
                        // Convert Bitmap to a byte array
                        using (MemoryStream ms = new MemoryStream())
                        {
                            qrCodeImage.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                            return File(ms.ToArray(), "image/png");
                        }
                    }
                }
            }
        }

        public async Task<ActionResult> TrackAttendance(string studentId, Guid WorkoutId)
        {
            //Find student and load their regimens
            var student = await db.Students.Include(s => s.Regimens).FirstOrDefaultAsync(s => s.StudentID == studentId);

            if (student == null) 
            {
                return View("Error");
            }

            //find the latest regimen
            var regimen = student.Regimens.OrderByDescending(d => d.DateCreated).FirstOrDefault();

            //Get the specific workout that the student scanned
            var workout = regimen.Workouts.Where(w => w.WorkoutID == WorkoutId).FirstOrDefault();

            if(workout == null)
            {
                ViewBag.Error = "Workout Not Found.";
                return View("Error");
            }

            workout.TimesTrained++;

            await db.SaveChangesAsync();

            return RedirectToAction("AttendanceRecorded", workout);

        }

        public ActionResult AttendanceRecorded(Workout model)
        {
            
            return View(model);
        }


        public async Task<ActionResult> ViewWorkout(Guid id)
        {

            var workout = await db.Workouts
                         .Include(r => r.Regimen)
                         .Include(w => w.Excercises)  
                         .FirstOrDefaultAsync(w => w.WorkoutID == id);

            if (workout == null)
            {
                return HttpNotFound();
            }

            ViewBag.StudentId = User.Identity.GetUserId();

            return View(workout);
        }


        [HttpGet]
        public async Task<ActionResult> NewGoal()
        {
            string studentId = User.Identity.GetUserId();

            var student = await db.Students.FindAsync(studentId);
            if (student == null)
            {
                return View("Error");
            }

            var regimen = await db.Regimens
                .Where(r => r.StudentID == studentId)
                .OrderByDescending(r => r.DateCreated)
                .FirstOrDefaultAsync();

            if (regimen != null)
            {
                var workouts = await db.Workouts
                    .Where(w => w.RegimenID == regimen.RegimenID)
                    .ToListAsync();

                ViewBag.Student = student;
                ViewBag.Workouts = new SelectList(workouts, "WorkoutID", "Name");

                return View();
            }

            ViewBag.Message = "No regimen found.";
            return View();
        }


        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> NewGoal(WorkoutGoal model)
        {

            if (ModelState.IsValid)
            {
                var Student = await db.Students.FindAsync(model.StudentID);
                var Wrkout = await db.Workouts.FindAsync(model.WorkoutID);

                var workoutGoal = new WorkoutGoal
                {
                    GoalID = Guid.NewGuid(),
                    GoalName = model.GoalName,
                    GoalDescription = model.GoalDescription,
                    GoalCount = model.GoalCount,
                    DateCreated = DateTime.Now.Date,
                    IsCompleted = false,
                    StudentID = model.StudentID,
                    Student = Student,
                    WorkoutID = model.WorkoutID,
                    Workout = Wrkout
                };

                db.WorkoutGoals.Add(workoutGoal);
                await db.SaveChangesAsync();

                return RedirectToAction("WorkoutDashboard");
            }

            // If we get here, something went wrong. Re-fetch the necessary data.
            var student = await db.Students.FindAsync(model.StudentID);

            if (student == null)
            {
                return View("Error");
            }

            var regimen = await db.Regimens
                .Where(r => r.StudentID == model.StudentID)
                .OrderByDescending(r => r.DateCreated)
                .FirstOrDefaultAsync();

            if (regimen != null)
            {
                var workouts = await db.Workouts
                    .Where(w => w.RegimenID == regimen.RegimenID)
                    .ToListAsync();

                // Repopulate ViewBag with necessary data for the view
                ViewBag.Student = student;
                ViewBag.Regimen = regimen;
                ViewBag.Workouts = workouts;

                // Return the view with the current model to show validation errors
                return View(model);
            }

            // Handle the case where no regimen is found
            ViewBag.Message = "No regimen found.";
            return View(model);
        }

        [HttpPost]
        public async Task<ActionResult> MarkGoalCompleted(Guid goalId)
        {
            try
            {
                EmailHelper helper = new EmailHelper();
                string studentId = User.Identity.GetUserId();

                var student = await db.Students.FindAsync(studentId);

                // Fetch the goal
                var goal = await db.WorkoutGoals.FindAsync(goalId);

                if (goal == null || goal.StudentID != studentId)
                {
                    return HttpNotFound();
                }

                // Update the goal status
                goal.IsCompleted = true;
                db.Entry(goal).State = EntityState.Modified;
                await db.SaveChangesAsync();

                // Send email notification
                await helper.SendGoalCompletionEmailAsync(student.StudentEmail, goal.GoalName);

                // Return JSON response for AJAX
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
              
                // Return JSON response with error
                return Json(new { success = false, message = ex.Message });
            }
        }

        public async Task<ActionResult> ViewAllGoals()
        {
            string studentId = User.Identity.GetUserId();

            // Fetch the goals for the student
            var goals = await db.WorkoutGoals
                .Where(g => g.StudentID == studentId)
                .ToListAsync();

            if (goals == null || !goals.Any())
            {
                ViewBag.Message = "No goals found.";
            }

            return View(goals);
        }

        [HttpPost]
        public async Task<ActionResult> DeleteGoal(Guid goalId)
        {
            string studentId = User.Identity.GetUserId();

            // Fetch the goal
            var goal = await db.WorkoutGoals.FindAsync(goalId);

            if (goal == null || goal.StudentID != studentId)
            {
                return HttpNotFound();
            }

            // Remove the goal from the database
            db.WorkoutGoals.Remove(goal);
            await db.SaveChangesAsync();

            // Redirect to the view all goals page or another appropriate page
            return RedirectToAction("ViewAllGoals");
        }

    }
}
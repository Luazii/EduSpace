using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels.Regimen_Models;
using Microsoft.AspNet.Identity;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;

namespace LearniVerseNew.Controllers
{
    public class HomeController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult Gainz()
        {
            string id = User.Identity.GetUserId();

            var student = db.Students.Include(st => st.Memberships).FirstOrDefault(s => s.StudentID == id);

            var membership = student?.Memberships
                           .OrderByDescending(s => s.MembershipStart)
                           .FirstOrDefault();

            if (membership != null && membership.IsActive) 
            {
               return RedirectToAction("MembershipHome");
            }                                     

            return View();
        }

        public async Task<ActionResult> MembershipHome()
        {
            string id = User.Identity.GetUserId();

            var student = await db.Students.Include(st => st.Memberships)
                                     .Include(wg => wg.WorkoutGoals)
                                     .Include(bd => bd.BodyComposistions)
                                     .Include(fr => fr.FoodRecords)
                                     .Include(r => r.Regimens)
                                     .FirstOrDefaultAsync(s => s.StudentID == id);

            var membership =  student?.Memberships.OrderByDescending(s => s.MembershipStart).FirstOrDefault();

            if(membership == null || membership.IsActive == false)
            {
                return RedirectToAction("Gainz", "Home");
            }
            var todaysFood = student?.FoodRecords
                                    .Where(fr => fr.DateRecorded == DateTime.Today)
                                    .OrderByDescending(fr => fr.DateRecorded)
                                    .FirstOrDefault();
            var latestBody =  student?.BodyComposistions.OrderByDescending(s => s.DateRecorded).FirstOrDefault();
            var regimen = student?.Regimens.OrderByDescending(s => s.DateCreated).FirstOrDefault();
            var todaysWorkout = regimen?.Workouts.Where(w => w.DayOfWeek == DateTime.Today.DayOfWeek).FirstOrDefault();
            var exercises = new List<Exercise>();
            var workoutGoals = student?.WorkoutGoals;

            if (todaysWorkout != null)
            {
                exercises = db.Exercises
                  .Where(e => e.WorkoutID == todaysWorkout.WorkoutID)
                  .ToList();

                todaysWorkout.Excercises = exercises;
            }
          
            ViewBag.Student = student;
            ViewBag.Membership = membership;
            ViewBag.TodaysFood = todaysFood;
            ViewBag.LatestBody = latestBody;
            ViewBag.TodaysWorkout = todaysWorkout;
            ViewBag.Regimen = regimen;
            ViewBag.WorkoutGoals = workoutGoals;

            double totalCalories = 0;
            if (todaysFood != null)
            {
                totalCalories = todaysFood.Meals.Sum(m => m.FoodItems.Sum(f => f.CaloriesPerServing));
            }

            ViewBag.TotalCalories = totalCalories;

            return View();
        }


        public ActionResult About()
        {
            ViewBag.Message = "Your application description page.";

            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Your contact page.";

            return View();
        }
    }
}
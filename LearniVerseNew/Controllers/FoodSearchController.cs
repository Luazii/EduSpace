using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels.Meal_Planner_Models;
using LearniVerseNew.Models.ApplicationModels.ViewModels;
using LearniVerseNew.Models.Helpers;
using Microsoft.AspNet.Identity;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;

namespace LearniVerseNew.Controllers
{
    public class FoodSearchController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();
        private readonly FatsecretHelper _fatsecretHelper;

        public FoodSearchController()
        {
            var httpClient = new HttpClient();
            _fatsecretHelper = new FatsecretHelper(httpClient);
        }

        // Constructor for dependency injection (if you use a DI library)
        public FoodSearchController(FatsecretHelper fatsecretHelper)
        {
            _fatsecretHelper = fatsecretHelper;
        }

        // GET: FoodSearch
        public ActionResult Index()
        {
            return View();
        }

        [HttpPost]
        public async Task<ActionResult> Search(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return Json(new { success = false, message = "Query cannot be empty" });
            }

            var foodResponse = await _fatsecretHelper.SearchFoodsAsync(query);

            // Directly pass the deserialized object to the view
            return Json(new { success = true, data = foodResponse });
        }



        public async Task<ActionResult> Dashboard(MealPlannerViewModel model)
        {
            string Id = User.Identity.GetUserId();
            var student = await db.Students.FindAsync(Id);

            DateTime today = DateTime.Today;

            var foodRecords = db.FoodRecords.Where(fr => fr.StudentID == Id);


            if (!foodRecords.Any()) 
            {
                ViewBag.NoRecords = "Hmm... Looks like you have not recorded any meals. You must be starving! Lets Record a Meal...";
            }

            var todaysRecord = await foodRecords
                                       .Where(fr => fr.StudentID == Id && fr.DateRecorded == today)
                                       .FirstOrDefaultAsync();

            var bodycomp = db.BodyComposistions.OrderByDescending(fr => fr.DateRecorded).Where(r => r.StudentID == Id).FirstOrDefault();
           

            if (todaysRecord == null)
            {
                var newRecord = new FoodRecord
                {
                    FoodRecordID = Guid.NewGuid(),
                    DateRecorded = DateTime.Today,
                    StudentID = Id,
                    Student = student,
                    Meals = new List<Meal>()
                };

                db.FoodRecords.Add(newRecord);

                await db.SaveChangesAsync();

                todaysRecord = newRecord;
            }

            if (student == null) 
            {
                return HttpNotFound();
            }

            model.Student = student;
            model.FoodRecords = foodRecords.ToList();
            model.TodaysRecord = todaysRecord;

            if(bodycomp == null)
            {
                model.BMR = 0;
                return View(model);
            }

            switch (bodycomp.Status)
            {
                case "Normal":
                    model.BMR = Math.Round(bodycomp.BMR * 1.375);
                    break;

                case "UnderWeight":
                    model.BMR = Math.Round(bodycomp.BMR * 1.55);
                    break;

                case "OverWeight":
                    model.BMR = Math.Round(bodycomp.BMR * 1.2);
                    break;
                case "Obese":
                    model.BMR = Math.Round(bodycomp.BMR * 1.2);
                    break;
                default:
                    model.BMR = Math.Round(bodycomp.BMR);
                    break;
            }

            
            return View(model);
        }

        public async Task<ActionResult> RecordMeal(FoodRecord record)
        {
            string Id = User.Identity?.GetUserId();

            DateTime today = DateTime.Today;

            var student = await db.Students.FindAsync(Id);

            if (student == null) 
            {
                return HttpNotFound();
            }


            var todaysRecord = await db.FoodRecords
                           .Where(fr => fr.StudentID == Id && fr.DateRecorded == today)
                           .FirstOrDefaultAsync();

            if (todaysRecord == null) 
            {
                var newRecord = new FoodRecord
                {
                    FoodRecordID = Guid.NewGuid(),
                    DateRecorded = DateTime.Today,
                    StudentID = Id,
                    Student = student,
                    Meals = new List<Meal>()
                };

                db.FoodRecords.Add(newRecord);

                await db.SaveChangesAsync();

                record = newRecord;

                return View(record);
            }

            return View(todaysRecord);


        }

        [HttpPost]
        public async Task<ActionResult> SaveMeal(List<MealDTO> meals)
        {
            DateTime today = DateTime.Today;

            var mealData = meals;

            if (meals == null || !meals.Any())
            {
                return Json(new { success = false, message = "No data received" });
            }
            // Loop through each meal data
            foreach (var mealDto in mealData)
            {
                // Check if FoodRecord exists or create a new one
                var foodRecord = db.FoodRecords.Include(fr => fr.Meals)
                                                .FirstOrDefault(fr => fr.DateRecorded == today && fr.StudentID == mealDto.StudentID);

                if (foodRecord == null)
                {
                    foodRecord = new FoodRecord
                    {
                        FoodRecordID = Guid.NewGuid(),
                        DateRecorded = DateTime.Now,
                        StudentID = mealDto.StudentID,
                        Student = await db.Students.FindAsync(mealDto.StudentID),
                        Meals = new List<Meal>()
                    };
                    db.FoodRecords.Add(foodRecord);
                }

                // Check if the meal already exists or create a new one
                var existingMeal = foodRecord.Meals.FirstOrDefault(m => m.Name == mealDto.MealName);
                if (existingMeal == null)
                {
                    existingMeal = new Meal
                    {
                        MealID = Guid.NewGuid(),
                        Name = mealDto.MealName,
                        FoodRecordID = foodRecord.FoodRecordID,
                        FoodItems = new List<FoodItem>()
                    };
                    foodRecord.Meals.Add(existingMeal);
                }

                // Add or update food items
                foreach (var foodItemDto in mealDto.Foods)
                {
                    var existingFoodItem = existingMeal.FoodItems.FirstOrDefault(f => f.FoodName == foodItemDto.FoodName &&
                                                                                     f.ServingSize == foodItemDto.ServingSize);

                    if (existingFoodItem == null)
                    {
                        existingFoodItem = new FoodItem
                        {
                            FoodItemID = Guid.NewGuid(), // Generate new ID for new food items
                            FoodName = foodItemDto.FoodName,
                            ServingSize = foodItemDto.ServingSize,
                            ServingWeightInGrams = foodItemDto.ServingWeightInGrams,
                            CaloriesPerServing = foodItemDto.Calories,
                            Protein = foodItemDto.Protein,
                            Carbohydrates = foodItemDto.Carbs,
                            Fats = foodItemDto.Fat,
                            TotalCalories = (foodItemDto.Calories * foodItemDto.ServingSize / 100)
                        };
                        existingMeal.FoodItems.Add(existingFoodItem);
                    }
                    else
                    {
                        // Update existing food item
                        existingFoodItem.ServingSize = foodItemDto.ServingSize;
                        existingFoodItem.ServingWeightInGrams = foodItemDto.ServingWeightInGrams;
                        existingFoodItem.CaloriesPerServing = foodItemDto.Calories;
                        existingFoodItem.Protein = foodItemDto.Protein;
                        existingFoodItem.Carbohydrates = foodItemDto.Carbs;
                        existingFoodItem.Fats = foodItemDto.Fat;
                        existingFoodItem.TotalCalories = (foodItemDto.Calories * foodItemDto.ServingSize / 100);
                    }
                }
            }

            // Save changes to the database
            await db.SaveChangesAsync();

            // Return a success response
            return Json(new { success = true });
        }



    }
}
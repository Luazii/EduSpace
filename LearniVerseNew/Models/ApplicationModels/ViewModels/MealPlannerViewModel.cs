using LearniVerseNew.Models.ApplicationModels.Meal_Planner_Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class MealPlannerViewModel
    {
        public Student Student { get; set; }
        public FoodRecord TodaysRecord { get; set; }
        public List<FoodRecord> FoodRecords { get; set; }

        public double BMR { get; set; }

    }
}
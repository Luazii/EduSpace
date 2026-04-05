using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Meal_Planner_Models
{
    public class MealDTO
    {
        public string StudentID { get; set; }
        public string MealName { get; set; }
        public List<FoodItemDTO> Foods { get; set; }
    }
}
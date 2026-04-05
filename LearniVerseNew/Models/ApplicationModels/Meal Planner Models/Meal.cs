using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Meal_Planner_Models
{
    public class Meal
    {
        [Key]
        public Guid MealID { get; set; }
        public string Name { get; set; }

        public Guid FoodRecordID { get; set; }
        public virtual FoodRecord FoodRecord { get; set; }
        public virtual ICollection<FoodItem> FoodItems { get; set; }
    }
}
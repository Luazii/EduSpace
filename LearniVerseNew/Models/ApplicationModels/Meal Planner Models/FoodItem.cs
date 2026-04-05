using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Meal_Planner_Models
{
    public class FoodItem
    {
        [Key]
        public Guid FoodItemID { get; set; }
        public string FoodName { get; set; }
        public double ServingSize { get; set; }
        public int ServingWeightInGrams { get; set; }
        public double CaloriesPerServing { get; set; }
        public double Protein { get; set; }
        public double Carbohydrates { get; set; }
        public double Fats { get; set; }

        public double TotalCalories ;

        public virtual Meal Meal { get; set; }
    }
}
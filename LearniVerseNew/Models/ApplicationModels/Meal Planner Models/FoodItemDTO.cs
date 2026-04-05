using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Meal_Planner_Models
{
    public class FoodItemDTO
    {
        [JsonProperty("FoodItemID")]
        public Guid FoodItemID { get; set; }

        [JsonProperty("FoodName")]
        public string FoodName { get; set; }

        [JsonProperty("ServingSize")]
        public double ServingSize { get; set; }

        [JsonProperty("ServingWeightInGrams")]
        public int ServingWeightInGrams { get; set; }

        [JsonProperty("Calories")]
        public double Calories { get; set; }

        [JsonProperty("Protein")]
        public double Protein { get; set; }

        [JsonProperty("Carbs")]
        public double Carbs { get; set; }

        [JsonProperty("Fat")]
        public double Fat { get; set; }
    }
}
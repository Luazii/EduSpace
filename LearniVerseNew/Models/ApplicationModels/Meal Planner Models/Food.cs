using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Meal_Planner_Models
{
    public class Food
    {
        [JsonProperty("food_description")]
        public string FoodDescription { get; set; }

        [JsonProperty("food_id")]
        public string FoodId { get; set; }

        [JsonProperty("food_name")]
        public string FoodName { get; set; }

        [JsonProperty("food_type")]
        public string FoodType { get; set; }

        [JsonProperty("food_url")]
        public string FoodUrl { get; set; }
    }
}
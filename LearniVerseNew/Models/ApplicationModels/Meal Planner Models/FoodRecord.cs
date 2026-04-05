using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Meal_Planner_Models
{
    public class FoodRecord
    {
        [Key]
        public Guid FoodRecordID { get; set; }
        public DateTime DateRecorded { get; set; }
        public string StudentID { get; set; }


        //nav props

        public virtual Student Student { get; set; }
        public virtual ICollection<Meal> Meals { get; set; }
    }
}
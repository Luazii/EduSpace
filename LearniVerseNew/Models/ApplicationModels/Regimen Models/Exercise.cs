using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Regimen_Models
{
    public class Exercise
    {
        [Key]
        public Guid ExceciseID { get; set; }
        public string  Name { get; set; }
        public string TargetMuscle { get; set; }
        public string Equipment { get; set; }
        public string Difficulty { get; set; }
        public string Instructions { get; set; }

        public int Sets { get; set; }
        public int Reps { get; set; }

        public Guid WorkoutID { get; set; }
        public virtual Workout Workout { get; set; }
    }
}
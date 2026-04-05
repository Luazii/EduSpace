using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Regimen_Models
{
    public class WorkoutGoal
    {
        [Key]
        public Guid GoalID { get; set; }
        public string GoalName { get; set; }
        public string GoalDescription { get; set; }
        public int GoalCount { get; set; }
        public DateTime DateCreated { get; set; }
        public bool IsCompleted { get; set; }

        public string StudentID { get; set; }
        public Guid WorkoutID { get; set; }

        public virtual Student Student { get; set; }
        public virtual Workout Workout { get; set; }
    }
}
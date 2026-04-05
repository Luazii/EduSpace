using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Regimen_Models
{
    public class Workout
    {
        public Guid WorkoutID { get; set; }
        public string Name { get; set; }
        public DayOfWeek DayOfWeek { get; set; }
        public int TimesTrained { get; set; }
        public Guid RegimenID { get; set; }

        //Navigation
        public virtual Regimen Regimen { get; set; }
        public virtual ICollection<Exercise> Excercises { get; set; }
        public virtual ICollection<WorkoutGoal> WorkoutGoals { get; set; }
    }
}
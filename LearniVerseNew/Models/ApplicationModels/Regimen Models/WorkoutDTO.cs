using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Regimen_Models
{
    public class WorkoutDTO
    {
        public string Name { get; set; }
        public DayOfWeek DayOfWeek { get; set; }
        public List<ExerciseDTO> Exercises { get; set; }
    }
}
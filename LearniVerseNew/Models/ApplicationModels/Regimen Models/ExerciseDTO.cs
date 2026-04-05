using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Regimen_Models
{
    public class ExerciseDTO
    {
        public string Name { get; set; }
        public string Difficulty { get; set; } 
        public string Instructions { get; set; }
        public string Muscle { get; set; }
        public string Equipment { get; set; }
        public int Reps { get; set; }
        public int Sets { get; set; }
    }
}
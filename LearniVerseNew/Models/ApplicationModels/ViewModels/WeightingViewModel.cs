using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class WeightingViewModel
    {
        public string CourseID { get; set; }
        public double QuizWeighting { get; set; }
        public double AssignmentWeighting { get; set; }
    }
}
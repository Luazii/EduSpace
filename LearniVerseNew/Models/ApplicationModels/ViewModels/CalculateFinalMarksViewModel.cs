using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class CalculateFinalMarksViewModel
    {
        public string CourseID { get; set; }
        public List<SelectListItem> Courses { get; set; }
        public double QuizWeighting { get; set; }
        public double AssignmentWeighting { get; set; }
    }
}
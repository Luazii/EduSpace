using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class CourseDetailsViewModel
    {
        public string CourseName { get; set; }
        public List<StudentFinalMarkViewModel> StudentFinalMarks { get; set; }
    }

    public class StudentFinalMarkViewModel
    {
        public string StudentID { get; set; }
        public string StudentName { get; set; }
        public double? FinalMark { get; set; }
    }
}
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class CourseSelectionViewModel
    {
        public List<Course> Courses { get; set; }
        public List<string> SelectedCourseIDs { get; set; }
    }
}
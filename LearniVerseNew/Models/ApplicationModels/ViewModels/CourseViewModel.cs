using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class CourseViewModel
    {
        public string CourseID { get; set; }
        public string CourseName { get; set; }
        public List<Enrollment> Enrollments { get; set; }
    }
}
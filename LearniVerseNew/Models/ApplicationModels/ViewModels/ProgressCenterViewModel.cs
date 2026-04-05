using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class ProgressCenterViewModel
    {
        public List<Course> Courses { get; set; }
        public string SelectedCourseId { get; set; }
    }
}
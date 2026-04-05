using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class AssignmentsViewModel
    {
        public string SelectedCourseId { get; set; }
        public SelectList Courses { get; set; }
        public List<Assignment> Assignments { get; set; }
    }
}
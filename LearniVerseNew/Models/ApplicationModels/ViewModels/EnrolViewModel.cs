using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class EnrolViewModel
    {
        public string StudentID { get; set; }
        public string StudentFirstName { get; set; }
        public string StudentLastName { get; set; }
        public List<Faculty> AvailableFaculties { get; set; }
        public string SelectedFaculty { get; set; }
        public List<string> SelectedCourseIDs { get; set; }
        public List<Course> SelectedCourses { get; set; }
        public List<Qualification> AvailableQualifications { get; set; }
        public string SelectedQualificationID { get; set; }
        public List<string> Departments { get; set; }
        public List<Course> AvailableCourses { get; set; }
        public decimal TotalPrice { get; set; }


    }
}
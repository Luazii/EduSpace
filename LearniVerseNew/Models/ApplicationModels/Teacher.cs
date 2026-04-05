using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Teacher
    {
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        [Display(Name = "Teacher ID")]
        public string TeacherID { get; set; }

        [Required]
        [Display(Name = "First Name")]
        public string TeacherFirstName { get; set; }

        [Required]
        [Display(Name = "Last Name")]
        public string TeacherLastName { get; set; }

        [Display(Name = "Email")]
        public string TeacherEmail { get; set; }

        [Display(Name = "Phone Number")]
        public string TeacherPhoneNumber { get; set; }

        [Display(Name = "Gender")]
        public string Gender { get; set; }

        [Display(Name = "Date of Birth")]
        public DateTime DOB { get; set; }

        [Display(Name = "Qualification")]
        public string Qualification { get; set; }

        public string FacultyID { get; set; }

        // Navigation property
        public virtual Faculty Faculty { get; set; }
        public virtual ICollection<Course> Courses { get; set; }
        public virtual ICollection<Assignment> Assignments { get; set; }
    }
}
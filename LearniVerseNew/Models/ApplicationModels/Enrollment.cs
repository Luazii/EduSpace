using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Enrollment
    {
        [Key]
        public Guid EnrollmentID { get; set; }

        [Display(Name = "Student ID")]
        public string StudentID { get; set; }
        public bool IsApproved { get; set; }
        public bool IsRejected { get; set; }
        public bool HasPaid { get; set; }

        [Display(Name = "Enrollment Date")]
        public DateTime EnrollmentDate { get; set; }

        public virtual Student Student { get; set; }
        public virtual ICollection<Course> Courses { get; set; }
        public virtual ICollection<StudentFinalMark> StudentFinalMarks { get; set; }

    }
}
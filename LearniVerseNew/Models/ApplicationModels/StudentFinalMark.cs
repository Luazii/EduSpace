using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class StudentFinalMark
    {
        [Key]
        public Guid ID { get; set; }
        public string StudentID { get; set; }
        public Guid EnrollmentID { get; set; }
        public string CourseID { get; set; }
        public double? FinalMark { get; set; }

        public virtual Student Student { get; set; }
        public virtual Enrollment Enrollment { get; set; }
        public virtual Course Course { get; set; }
    }
}
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Course
    {
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        [Display(Name = "Course ID")]
        public string CourseID { get; set; }

        [Required]
        [Display(Name = "Course Name")]
        public string CourseName { get; set; }

        [Display(Name = "Description")]
        public string Description { get; set; }

        [Display(Name = "Semester")]
        public int Semester { get; set; }

        [Required]
        [Display(Name = "Department")]
        public string Department { get; set; }

        [Display(Name = "Price")]
        public decimal Price { get; set; }

        [Display(Name = "Teacher ID")]
        public string TeacherID { get; set; }

        [Display(Name = "Qualification")]
        public string QualificationID { get; set; }

        public virtual Qualification Qualification { get; set; }
        public virtual Teacher Teacher { get; set; }
        public ICollection<Enrollment> Enrollments { get; set; }
        public ICollection<Resource> Resources { get; set; }
        public ICollection<Quiz> Quizzes { get; set; }
        public virtual ICollection<Assignment> Assignments { get; set; }
        public virtual ICollection<StudentFinalMark> StudentFinalMarks { get; set; }

    }
}
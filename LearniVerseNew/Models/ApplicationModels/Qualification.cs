using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Qualification
    {
        [Key]
        [Display(Name = "Qualification ID")]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public string QualificationID { get; set; }

        [Required]
        [Display(Name = "Name")]
        public string Name { get; set; }

        [Display(Name = "Description")]
        public string Description { get; set; }

        [Display(Name = "Duration")]
        public int Duration { get; set; }

        [Display(Name = "Faculty ID")]
        public string FacultyID { get; set; }


        public virtual Faculty Faculty { get; set; }

        public ICollection<Course> Courses { get; set; }
    }
}
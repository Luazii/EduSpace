using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;
using System.Text.Json.Serialization;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Faculty
    {
        [Key]
        [Display(Name = "Faculty ID")]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public string FacultyID { get; set; }

        [Required]
        [Display(Name = "Faculty Name")]
        public string FacultyName { get; set; }

        [Display(Name = "Description")]
        public string Description { get; set; }

        [JsonIgnore]
        public virtual ICollection<Qualification> Qualifications { get; set; }
        public virtual ICollection<Teacher> Teachers { get; set; }
    }
}
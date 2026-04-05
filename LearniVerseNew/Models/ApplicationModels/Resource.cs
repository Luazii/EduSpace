using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Resource
    {
        [Display(Name = "Resource ID")]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public Guid ResourceID { get; set; }

        [Display(Name = "File Name")]
        public string FileName { get; set; }

        [Display(Name = "Blob URL")]
        public string BlobURL { get; set; }

        [Display(Name = "Description")]
        public string FileDescription { get; set; }

        [Display(Name = "Course ID")]
        public string CourseID { get; set; }

        [Display(Name = "Course")]
        public virtual Course Course { get; set; }
    }
}
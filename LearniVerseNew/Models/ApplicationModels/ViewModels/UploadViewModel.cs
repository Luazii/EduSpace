using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class UploadViewModel
    {
        [Required(ErrorMessage = "Please Provide a File name")]
        [Display(Name = "File Name")]
        public string FileName { get; set; }

        [Required(ErrorMessage = "Please Provide a Description")]
        [Display(Name = "Description")]
        public string Description { get; set; }

        [Required(ErrorMessage = "Please select a file.")]
        [Display(Name = "File")]
        public HttpPostedFileBase File { get; set; }

        [Required(ErrorMessage = "Please select a course.")]
        [Display(Name = "Course")]
        public string CourseID { get; set; }
    }
}
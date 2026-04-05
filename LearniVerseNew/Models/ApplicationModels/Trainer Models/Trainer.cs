using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Trainer_Models
{
    public class Trainer
    {
        [Key]
        public string TrainerID { get; set; }  // This will be the same as the ASP.NET User ID

        [Required]
        public string FirstName { get; set; }

        [Required]
        public string LastName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Gender { get; set; }

        [Phone]
        public string PhoneNumber { get; set; }

        [Required]
        public string Specialization { get; set; }  // Area of Expertise

    }
}
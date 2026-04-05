using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class RegisterTrainerViewModel
    {
        
            [Required(ErrorMessage = "First name is required")]
            public string TrainerFirstName { get; set; }

            [Required(ErrorMessage = "Last name is required")]
            public string TrainerLastName { get; set; }

            [Required(ErrorMessage = "Email is required")]
            [EmailAddress(ErrorMessage = "Invalid email address")]
            public string TrainerEmail { get; set; }

            [Required(ErrorMessage = "Phone number is required")]
            [Phone(ErrorMessage = "Invalid phone number")]
            public string TrainerPhoneNumber { get; set; }

            [Required(ErrorMessage = "Gender is required")]
            public string Gender { get; set; }

            [Required(ErrorMessage = "Specialty is required")]
            public string Specialization { get; set; }  // Trainer's area of expertise

            [Required(ErrorMessage = "Password is required")]
            [DataType(DataType.Password)]
            public string Password { get; set; }

            [Required(ErrorMessage = "Password confirmation is required")]
            [Compare("Password", ErrorMessage = "Passwords do not match")]
            [DataType(DataType.Password)]
            public string ConfirmPassword { get; set; }

    }
}
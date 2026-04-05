using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Payment
    {
        [Key]
        [Display(Name = "Payment ID")]
        public int PaymentID { get; set; }

        [Required]
        [Display(Name = "Student ID")]
        public string StudentID { get; set; }

        [Required]
        [Display(Name = "Enrollemnt ID")]
        public Guid EnrollmentID { get; set; }

        [Required]
        [Display(Name = "Amount Paid")]
        public decimal AmountPaid { get; set; }

        [Required]
        [Display(Name = "Payment Reference")]
        public string PaymentReference { get; set; }

        [Required]
        [Display(Name = "Payment Date")]
        public DateTime PaymentDate { get; set; }

        // Navigation properties

        public virtual Student Student { get; set; }
        public virtual Enrollment Enrollment { get; set; }


        public static string GeneratePaymentReference(string studentId)
        {
            string dateTime = DateTime.Now.ToString("yyyyMMdd");

            Random rand = new Random();
            int randomNumber = rand.Next(1000, 9999);

            string paymentReference = $"{dateTime}-{studentId}-{randomNumber}";

            return paymentReference;
        }
    }
}
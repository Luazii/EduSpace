using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Store_Models
{
    public class Transaction
    {
        [Key]
        public Guid TransactionID { get; set; } 

        [Required]
        public Guid OrderID { get; set; } 

        [Required]
        public decimal Amount { get; set; } 

        public string Status { get; set; } 

        public DateTime TransactionDate { get; set; }
        public string TransactionType { get; set; }

        public string PaystackReference { get; set; } 

        // Navigation property for the related order
        public virtual Order Order { get; set; }
    }
}
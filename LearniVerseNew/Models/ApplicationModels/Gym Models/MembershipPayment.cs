using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Gym_Models
{
    public class MembershipPayment
    {
        [Key]
        public Guid PaymentID { get; set; }
        public string StudentID { get; set; }
        public Guid MembershipID { get; set; }
        public decimal Amount { get; set; }
        public string CustomerCode { get; set; } // From Paystack
        public string PlanCode { get; set; } // From Paystack
        public string Status { get; set; } // From Paystack
        public DateTime TransactionDate { get; set; }

        // Navigation properties
        public virtual Student Student { get; set; }
        public virtual Membership Membership { get; set; }
    }
}
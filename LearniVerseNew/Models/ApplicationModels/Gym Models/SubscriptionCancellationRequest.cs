using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Gym_Models
{
    public class SubscriptionCancellationRequest
    {
        [Key]
        public Guid RequestID { get; set; }

        public string StudentID { get; set; }
        public Guid MembershipID { get; set; }
        public DateTime RequestDate { get; set; }
        public string RequestStatus { get; set; } // Pending, Approved, Rejected
        public string Reason { get; set; }

        // Navigation Properties
        public virtual Student Student { get; set; }

        [Required]
        public virtual Membership Membership { get; set; }
    }
}
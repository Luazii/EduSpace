using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Gym_Models
{
    public class Membership
    {
        [Key]   
        public Guid MembershipID { get; set; }
        public string MembershipTier { get; set; }
        public DateTime MembershipStart { get; set; }
        public DateTime MembershipEnd { get; set; }
        public int MembershipDuration { get; set; }
        public decimal MembershipPrice { get; set; }
        public bool HasPaid { get; set; }
        public bool IsActive { get; set; }
        public string StudentID { get; set; }
        public virtual Student Student { get; set; }

        public Guid PlanID { get; set; }
        public virtual Plans Plan { get; set; }

        public Guid PaymentID { get; set; }
        public virtual ICollection<MembershipPayment> MembershipPayments { get; set; }
        public Guid? RequestID { get; set; }

        [ForeignKey(nameof(RequestID))]
        public virtual SubscriptionCancellationRequest SubscriptionCancellationRequests { get; set; }

    }
}
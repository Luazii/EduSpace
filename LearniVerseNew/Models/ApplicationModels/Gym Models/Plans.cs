using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Gym_Models
{
    public class Plans
    {
        [Key]
        public Guid PlanID { get; set; }
        public string PlanName { get; set; }
        public int PlanDuration { get; set; }
        public decimal PlanCost { get; set; }
        public string PlanCode { get; set; } //from paystack
    }
}
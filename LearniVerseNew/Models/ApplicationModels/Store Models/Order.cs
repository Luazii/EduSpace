using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Store_Models
{
    public class Order
    {
        [Key]
        public Guid OrderID { get; set; }

        [Required]
        public DateTime DateOrdered { get; set; }

        [Required]
        public string StudentID { get; set; }

        // Navigation property for the student who placed the order
        public virtual Student Student { get; set; }

        public decimal TotalPrice { get; set; }

        [Required]
        public string ShippingAddress { get; set; }

        [Required]
        public string City { get; set; }

        [Required]
        public string State { get; set; }

        [Required]
        public string PostalCode { get; set; }
        public bool IsDelivered { get; set; }
        public string Status { get; set; }

        // Navigation property for order items
        public virtual ICollection<OrderItem> OrderItems { get; set; }
        public virtual ICollection<OrderTrackingHistory> TrackingHistory { get; set; }

    }
}
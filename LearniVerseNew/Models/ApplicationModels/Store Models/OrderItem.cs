using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Store_Models
{
    public class OrderItem
    {
        [Key]
        public Guid OrderItemID { get; set; }

        [Required]
        public Guid OrderID { get; set; }

        // Navigation property for the order this item belongs to
        public virtual Order Order { get; set; }

        [Required]
        public Guid ProductID { get; set; }

        // Navigation property for the product
        public virtual Product Product { get; set; }

        [Required]
        public int Quantity { get; set; }
    }
}
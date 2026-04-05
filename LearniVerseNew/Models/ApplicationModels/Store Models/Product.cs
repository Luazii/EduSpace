using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Store_Models
{
    public class Product
    {
        [Key]
        public Guid ProductID { get; set; }

        [Required]
        public string ProductName { get; set; }

        public decimal Price { get; set; }

        public string Description { get; set; }

        public int QuantityInStock { get; set; }

        public int LowStockThreshold { get; set; }

        public string ImageName { get; set; }

        public string ImageUrl { get; set; }

        public Guid CategoryID { get; set; }

        // Navigation property for the Category
        public virtual Category Category { get; set; }

        public virtual ICollection<ProductReview> Reviews { get; set; }

    }
}
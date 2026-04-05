using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Store_Models
{
    public class CartItem
    {
        public Guid ProductID { get; set; }
        public string ProductName { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
    }
}
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Store_Models
{
    public class ProductReview
    {
        [Key]
        public Guid ReviewID { get; set; }
        public string ReviewerName { get; set; }
        public string ReviewText { get; set; }
        public int Rating { get; set; }
        public DateTime ReviewDate { get; set; }
        public string UserID { get; set; }
        public Guid ProductID { get; set; }

        public virtual Product Product { get; set; }
    }
}
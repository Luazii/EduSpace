using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Store_Models
{
    public class OrderTrackingHistory
    {
        [Key]
        public Guid TrackingID { get; set; } // Primary key

        [Required]
        public Guid OrderID { get; set; } // Foreign key to the Order table

        [Required]
        [MaxLength(50)]
        public string TrackingStage { get; set; } // Stage of the tracking (e.g., At Warehouse, Delivered)

        [Required]
        public DateTime Timestamp { get; set; } // Date and time when the status was updated

        [Required]
        [MaxLength(50)]
        public string UpdatedBy { get; set; } // Name of the user/admin who updated the status

        // Navigation property to the Order entity
        [ForeignKey("OrderID")]
        public virtual Order Order { get; set; }
    }
}
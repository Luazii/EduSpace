using LearniVerseNew.Models.ApplicationModels.Store_Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class AdminNotification
    {
        [Key]
        public Guid NotificationID { get; set; }

        [Required]
        public string Message { get; set; } // The notification message

        public DateTime CreatedAt { get; set; } // When the notification was created

        public bool IsRead { get; set; } // Indicates if the notification has been read

        public Guid ProductID { get; set; } // ID of the product in low stock

        [ForeignKey("ProductID")]
        public virtual Product Product { get; set; } // Navigation property
    }
}
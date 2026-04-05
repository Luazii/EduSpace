using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Booking
    {
        [Key]
        public Guid BookingID { get; set; }

        [Required]
        public string StudentID { get; set; }
        [Required]
        public string RoomID { get; set; }

        [Required]
        [Display(Name = "Time Slot")]
        public Guid TimeSlotID { get; set; }

        [Required]
        [Display(Name = "Booking Date")]
        [DataType(DataType.Date)]
        public DateTime BookingDate { get; set; }

        public virtual Student Student { get; set; }
        public virtual Room Room { get; set; }
        public virtual TimeSlot TimeSlot { get; set; }
    }
}
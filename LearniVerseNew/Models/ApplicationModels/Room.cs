using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Room
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public string RoomID { get; set; }

        [Required]
        [Display(Name = "Campus")]
        public string Campus { get; set; }

        public virtual ICollection<TimeSlot> AvailableTimeSlots { get; set; }
        public enum Venues
        {
            Ritson,
            Steve,
            ML
        }
    }

    public class TimeSlot
    {
        [Key]
        public Guid TimeSlotID { get; set; }
        public string SlotName { get; set; }

        [Required]
        [Display(Name = "Start Time")]
        [DataType(DataType.Time)]
        public TimeSpan StartTime { get; set; }

        [Required]
        [Display(Name = "End Time")]
        [DataType(DataType.Time)]
        public TimeSpan EndTime { get; set; }

        // Navigation property to link to the room
        public string RoomID { get; set; }
        public virtual Room Room { get; set; }
    }

}
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Regimen_Models
{
    public class Regimen
    {
        [Key]
        public Guid RegimenID { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
        public int AttendanceGoal { get; set; }

        public DateTime DateCreated { get; set; }
        public string StudentID { get; set; }

        //Navigation
        public virtual Student Student { get; set; }
        public virtual ICollection<Workout> Workouts { get; set; }
    }
}
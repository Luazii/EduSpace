using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearniVerseNew.Models.ApplicationModels.Trainer_Models
{
    public class TrainingSession
    {
        [Key]
        public Guid TrainingSessionID { get; set; }
        public string SessionName { get; set; }
        public DateTime SessionDate { get; set; }
        public TimeSpan SessionStart { get; set; }
        public int Duration { get; set; }
        public TimeSpan SessionEnd { get; set; }

        public int MaxParticipants { get; set; }

        public string TrainerID { get; set; }

        //Nav   
        [ForeignKey("TrainerID")]
        public virtual Trainer Trainer { get; set; }
        public virtual ICollection<Student> Participants { get; set; } = new List<Student>();


    }
}
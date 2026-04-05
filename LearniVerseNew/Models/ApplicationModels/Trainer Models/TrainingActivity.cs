using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.Trainer_Models
{
    public class TrainingActivity
    {
        [Key]
        public Guid ActivityID { get; set; }
        public string ActivityName { get; set; }
        public TimeSpan DefaultStartTime { get; set; }
        public int DafaultDuration { get; set; }

        
        public string TrainerID { get; set; }

        [ForeignKey("TrainerID")]
        public virtual Trainer Trainer { get; set; }
    }
}
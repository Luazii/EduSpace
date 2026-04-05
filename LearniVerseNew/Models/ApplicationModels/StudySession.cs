using LearniVerseNew.Models.ApplicationModels;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models
{
    public class StudySession
    {
        [Key]
        public Guid StudySessionID { get; set; }
        public DateTime SessionDate { get; set; }
        // Foreign key for Student
        public string StudentID { get; set; }
        public virtual Student Student { get; set; }

        public virtual ICollection<TaskItem> TaskItems { get; set; }
    }
}
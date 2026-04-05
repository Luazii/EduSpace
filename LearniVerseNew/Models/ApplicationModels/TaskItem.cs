using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class TaskItem
    {
        [Key]
        public Guid TaskID { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public bool IsComplete { get; set; }

        public Guid StudySessionID { get; set; }
        public virtual StudySession StudySession { get; set; }
    }
}
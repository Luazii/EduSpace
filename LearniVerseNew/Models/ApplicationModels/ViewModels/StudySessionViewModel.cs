using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class StudySessionViewModel
    {
        public Guid StudySessionID { get; set; }
        public DateTime SessionDate { get; set; }
        public string StudentID { get; set; }
        public ICollection<TaskItem> TaskItems { get; set; }
    }
}
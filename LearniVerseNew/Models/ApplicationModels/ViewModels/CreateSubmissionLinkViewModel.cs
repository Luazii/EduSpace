using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class CreateSubmissionLinkViewModel
    {
        public Guid AssignmentID { get; set; }
        public DateTime Deadline { get; set; }
    }
}
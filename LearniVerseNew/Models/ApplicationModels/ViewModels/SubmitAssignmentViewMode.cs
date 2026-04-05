using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class SubmitAssignmentViewMode
    {
        public Guid AssignmentID { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
    }
}
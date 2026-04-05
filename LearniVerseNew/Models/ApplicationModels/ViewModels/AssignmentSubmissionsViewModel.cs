using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class AssignmentSubmissionsViewModel
    {
        public Assignment Assignment { get; set; }
        public List<Submission> Submissions { get; set; }
    }
}
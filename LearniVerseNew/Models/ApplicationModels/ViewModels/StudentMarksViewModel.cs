using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class StudentMarksViewModel
    {
        public string StudentId { get; set; }
        public string StudentName { get; set; }
        public decimal QuizMark { get; set; }
        public decimal AssignmentMark { get; set; }
        public decimal FinalMark { get; set; }
    }
}
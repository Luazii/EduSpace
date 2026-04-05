using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class ClassroomViewModel
    {
        public Course Course { get; set; }
        public List<Resource> Resources { get; set; }
        public List<Assignment> Assignments { get; set; }
        public List<Quiz> Quizzes { get; set; }
        public List<LiveSession> LiveSessions { get; set; }
    }
}
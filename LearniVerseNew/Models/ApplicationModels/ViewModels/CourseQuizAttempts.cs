using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class CourseQuizAttempts
    {
        public string CourseName { get; set; }
        public List<QuizAttempt> QuizAttempts { get; set; }
    }
}
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class StudentDashboardViewModel
    {
        public Student Student { get; set; }
        public List<Payment> Payments { get; set; }
        public List<Quiz> Quizzes { get; set; }
        public List<QuizAttempt> QuizAttempts { get; set; }
        
    }
}
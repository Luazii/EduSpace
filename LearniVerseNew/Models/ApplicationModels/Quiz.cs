using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Windows.Forms;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Quiz
    {
        public Guid QuizID { get; set; }
        public string QuizDescription { get; set; }
        public int QuizMaxMark { get; set; }
        public DateTime QuizDate { get; set; }
        public TimeSpan QuizStart { get; set; }
        public TimeSpan QuizEnd { get; set; }
        public DateTime DateCreated { get; set; }
        public int MaxAttempts { get; set; }
        public int Duration { get; set; }
        public string Status { get; set; }

        public virtual ICollection<Question> Questions { get; set; }

        public string TeacherID { get; set; }
        public virtual Teacher Teacher { get; set; }

        public string CourseID { get; set; } 
        public virtual Course Course { get; set; } 

        public enum QuizStatus
        {
            Draft,
            Published
        }


        
    }
}
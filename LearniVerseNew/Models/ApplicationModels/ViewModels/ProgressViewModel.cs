using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class ProgressViewModel
    {
        public string Coursename { get; set; }
        public List<QuizAttempt> QuizAttempts { get; set; }
        public List<Submission> Submissions { get; set; }
        public List<CourseQuizAttempts> CoursesQuizAttempts { get; set; }
        public int HighestMark { get; set; }
        public double AverageMark { get; set; }
        public double? AverageSubmissionMark { get; set; }

        /// <summary>Weighted quiz percentage across all quizzes in this course.</summary>
        public double QuizPercent { get; set; }

        /// <summary>Weighted assignment percentage across all graded submissions.</summary>
        public double AssignmentPercent { get; set; }

        /// <summary>Teacher-published final mark, or a live weighted estimate.</summary>
        public double? FinalMark { get; set; }
    }
}
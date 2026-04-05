using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class ReviewApplicationViewModel
    {
        public Student Student { get; set; }
        public Enrollment Enrollment { get; set; }
        public NSCSubmission NSC { get; set; }
        public List<NSCSubject> Subjects { get; set; }

        public decimal average { get; set; }

        public decimal CalcAverage(List<NSCSubject> subjects)
        {
            decimal average = 0;
            int subjectCount = subjects.Count();
            decimal marks = 0;
            foreach (var subject in subjects)
            {
                marks += subject.Marks;
            }

            average = marks / subjectCount;

            return Math.Round(average, 1);
        }
    }
}
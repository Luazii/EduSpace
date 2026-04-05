using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class QuizViewModel
    {
        public Quiz Quiz { get; set; }
        public List<Question> Questions { get; set; }
        public Dictionary<Guid, string> SubmittedAnswers { get; set; }
        public int CurrentQuestionIndex { get; set; }
    }
}
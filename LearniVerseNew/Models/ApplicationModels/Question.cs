using Azure.Storage.Blobs.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Question
    {
        public Guid QuestionID { get; set; }
        public int QuestionNumber { get; set; }
        public string QuestionText { get; set; }
        public string AnswerA { get; set; } 
        public string AnswerB { get; set; }
        public string AnswerC { get; set; }
        public string AnswerD { get; set; }
        public string CorrectAnswer { get; set; } 
        public int Weighting { get; set; }
        public Guid QuizID { get; set; }

        public virtual Quiz Quiz { get; set; }


        public bool CheckAnswer(Guid id, string SelectedAns)
        {
            ApplicationDbContext db = new ApplicationDbContext();

            QuestionID = id;

            var Question = db.Questions.Find(id);

            if (Question != null)
            {
                if(SelectedAns == Question.CorrectAnswer)
                {
                    return true;
                }
                return false;
            }

            return false;

        }
    }
}
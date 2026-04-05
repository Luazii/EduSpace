using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class NSCSubmission
    {
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public Guid NSCSubmissionID { get; set; }
        public string DocumentName { get; set; }
        public string DocumentURL { get; set; }
        public DateTime SubmissionDate { get; set; }
        public int Marks { get; set; }
        public List<NSCSubject> Subjects { get; set; }
        public virtual Student Student { get; set; }

        public enum NationalSubjects
        {
            Mathematics,
            PhysicalScience,
            LifeSciences,
            Geography,
            History,
            Accounting,
            Economics,
            BusinessStudies,
            English,
            Afrikaans,
            isiZulu
        }
    }

    public class NSCSubject
    {
        public int NSCSubjectID { get; set; }
        public string Subject { get; set; }
        public decimal Marks { get; set; }

        
        public Guid NSCSubmissionID { get; set; }

        
        public virtual NSCSubmission NSCSubmission { get; set; }
    }
}
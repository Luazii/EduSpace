using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Assignment
    {
        public Guid AssignmentID { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public DateTime Deadline { get; set; }
        public string CourseID { get; set; }
        public virtual Course Course { get; set; }

        public int? MaxMark { get; set; }

        public string TeacherID { get; set; }
        public virtual Teacher Teacher { get; set; }
        public virtual ICollection<Submission> Submissions { get; set; }
    }
}
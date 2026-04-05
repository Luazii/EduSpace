using System;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class LiveSession
    {
        public Guid LiveSessionID { get; set; }
        public string Title { get; set; }
        public string MeetingUrl { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }

        /// <summary>"Scheduled" | "Live" | "Completed"</summary>
        public string Status { get; set; }

        public string CourseID { get; set; }
        public virtual Course Course { get; set; }

        public string TeacherID { get; set; }
        public virtual Teacher Teacher { get; set; }

        public DateTime CreatedAt { get; set; }

        /// <summary>True when the session is currently active.</summary>
        public bool IsLive => DateTime.Now >= StartTime && DateTime.Now <= EndTime;
    }
}

using LearniVerseNew.Models.ApplicationModels.Trainer_Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace LearniVerseNew.Models.ApplicationModels.ViewModels
{
    public class TrainerDashboardViewModel
    {
        public List<TrainingSession> TodaySessions { get; set; }
        public int TotalParticipants { get; set; }
        public List<TrainingSession> UpcomingSessions { get; set; }
    }
}
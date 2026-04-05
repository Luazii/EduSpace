using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;
using LearniVerseNew.Models.ApplicationModels.Gym_Models;
using LearniVerseNew.Models.ApplicationModels.Meal_Planner_Models;
using LearniVerseNew.Models.ApplicationModels.Regimen_Models;
using LearniVerseNew.Models.ApplicationModels.Store_Models;
using LearniVerseNew.Models.ApplicationModels.Trainer_Models;

namespace LearniVerseNew.Models.ApplicationModels
{
    public class Student
    {
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        [Display(Name = "Student ID")]
        public string StudentID { get; set; }

        [Display(Name = "First Name")]
        public string StudentFirstName { get; set; }

        [Display(Name = "Last Name")]
        public string StudentLastName { get; set; }

        [Display(Name = "Email")]
        public string StudentEmail { get; set; }

        [Display(Name = "Phone Number")]
        public string PhoneNumber { get; set; }

        [Display(Name = "Gender")]
        public string Gender { get; set; }

        [Display(Name = "Date of Birth")]
        public DateTime DOB { get; set; }

        public string FacultyID { get; set; }
        public string QualificationID { get; set; }

        public virtual Faculty Faculty { get; set; }
        public virtual Qualification Qualification { get; set; }

        public ICollection<Enrollment> Enrollments { get; set; }

        public virtual ICollection<QuizAttempt> QuizAttempts { get; set; }

        public virtual ICollection<Booking> Bookings { get; set; }

        public virtual ICollection<StudySession> StudySessions { get; set; }

        public virtual ICollection<StudentFinalMark> StudentFinalMarks { get; set; }
        public virtual ICollection<Membership> Memberships { get; set; }
        public virtual ICollection<BodyComposistion> BodyComposistions { get; set; }
        public virtual ICollection<MembershipPayment> MembershipPayments { get; set; }
        public virtual ICollection<SubscriptionCancellationRequest> SubscriptionCancellationRequests { get; set; }
        public virtual ICollection<FoodRecord> FoodRecords { get; set; }

        public virtual ICollection<Regimen> Regimens { get; set; }

        public virtual ICollection<WorkoutGoal> WorkoutGoals { get; set; }

        public virtual ICollection<Order> Orders { get; set; }
        public virtual ICollection<TrainingSession> TrainingSessions { get; set; }
    }
}
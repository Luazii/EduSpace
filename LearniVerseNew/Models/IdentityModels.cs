using System.Data.Entity;
using System.Security.Claims;
using System.Threading.Tasks;
using LearniVerseNew.Models.ApplicationModels;
using LearniVerseNew.Models.ApplicationModels.Gym_Models;
using LearniVerseNew.Models.ApplicationModels.Meal_Planner_Models;
using LearniVerseNew.Models.ApplicationModels.Regimen_Models;
using LearniVerseNew.Models.ApplicationModels.Store_Models;
using LearniVerseNew.Models.ApplicationModels.Trainer_Models;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.EntityFramework;


namespace LearniVerseNew.Models
{
    // You can add profile data for the user by adding more properties to your ApplicationUser class, please visit https://go.microsoft.com/fwlink/?LinkID=317594 to learn more.
    public class ApplicationUser : IdentityUser
    {
        public async Task<ClaimsIdentity> GenerateUserIdentityAsync(UserManager<ApplicationUser> manager)
        {
            // Note the authenticationType must match the one defined in CookieAuthenticationOptions.AuthenticationType
            var userIdentity = await manager.CreateIdentityAsync(this, DefaultAuthenticationTypes.ApplicationCookie);
            // Add custom user claims here
            return userIdentity;
        }
    }

    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext()
            : base("LearniverseDeploymentString", throwIfV1Schema: false)
        {
            this.Configuration.LazyLoadingEnabled = true;
        }

        public static ApplicationDbContext Create()
        {
            return new ApplicationDbContext();
        }

        public DbSet<Student> Students { get; set; }
        public DbSet<Teacher> Teachers { get; set; }
        public DbSet<Faculty> Faculties { get; set; }
        public DbSet<Qualification> Qualifications { get; set; }
        public DbSet<Course> Courses { get; set; }
        public DbSet<Enrollment> Enrollments { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Resource> Resources { get; set; }
        public DbSet<Quiz> Quizzes { get; set; }
        public DbSet<QuizAttempt> QuizAttempts { get; set; }   
        public DbSet<Question> Questions { get; set; }   
        public DbSet<NSCSubmission> NSCSubmissions { get; set; }   
        public DbSet<NSCSubject> NSCSubjects { get; set; }   
        public DbSet<Booking> Bookings { get; set; }   
        public DbSet<Room> Rooms { get; set; }
        public DbSet<TimeSlot> TimeSlots { get; set; }
        public DbSet<StudySession> StudySessions { get; set; }
        public DbSet<TaskItem> TaskItems { get; set; }
        public DbSet<Assignment> Assignments { get; set; }
        public DbSet<Submission> Submissions { get; set; }
        public DbSet<StudentFinalMark> StudentFinalMarks { get; set; }
        public DbSet<Membership> Memberships { get; set; }
        public DbSet<BodyComposistion> BodyComposistions { get; set; }
        public DbSet<Plans> Plans { get; set; }
        public DbSet<MembershipPayment> MembershipPayments { get; set; }
        public DbSet<SubscriptionCancellationRequest> SubscriptionCancellationRequests { get; set; }

        public DbSet<FoodRecord> FoodRecords { get; set; }
        public DbSet<Meal> Meals { get; set; }
        public DbSet<FoodItem> FoodItems { get; set; }
        public DbSet<Exercise> Exercises { get; set; }
        public DbSet<Workout> Workouts { get; set; }
        public DbSet<Regimen> Regimens { get; set; }
        public DbSet<WorkoutGoal> WorkoutGoals { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<OrderTrackingHistory> OrderTrackingHistories { get; set; }
        public DbSet<ProductReview> ProductReviews { get; set; }
        public DbSet<AdminNotification> AdminNotifications { get; set; }
        public DbSet<LiveSession> LiveSessions { get; set; }
        public DbSet<Trainer> Trainers { get; set; }
        public DbSet<TrainingActivity> TrainingActivities { get; set; }


        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Order>()
            .HasMany(o => o.TrackingHistory)
            .WithRequired(th => th.Order)
            .HasForeignKey(th => th.OrderID)
            .WillCascadeOnDelete(true);

            modelBuilder.Entity<Course>()
         .HasKey(c => c.CourseID);

            modelBuilder.Entity<Course>()
                .HasOptional(c => c.Teacher) // Optional relationship
                .WithMany(t => t.Courses)    // One-to-many relationship: One teacher can teach multiple courses
                .HasForeignKey(c => c.TeacherID); // Foreign key property

            // Resource entity configuration
            modelBuilder.Entity<Resource>()
                .HasRequired(r => r.Course)  // Each Resource must belong to a Course
                .WithMany(c => c.Resources) // One Course can have many Resources
                .HasForeignKey(r => r.CourseID); // Foreign key property

            // Enrollment entity configuration
            modelBuilder.Entity<Enrollment>()
                .HasKey(e => e.EnrollmentID);

            modelBuilder.Entity<Enrollment>()
                .HasRequired(e => e.Student)  // Each Enrollment must belong to a Student
                .WithMany(s => s.Enrollments) // One Student can have many Enrollments
                .HasForeignKey(e => e.StudentID); // Foreign key property

            // Qualification entity configuration
            modelBuilder.Entity<Qualification>()
                .HasRequired(q => q.Faculty) // Each Qualification must belong to a Faculty
                .WithMany(f => f.Qualifications) // One Faculty can have many Qualifications
                .HasForeignKey(q => q.FacultyID); // Foreign key property

            // Course-Qualification relationship configuration
            modelBuilder.Entity<Course>()
                .HasRequired(c => c.Qualification) // Each Course must belong to a Qualification
                .WithMany(q => q.Courses) // One Qualification can have many Courses
                .HasForeignKey(c => c.QualificationID); // Foreign key property

            // Teacher-Faculty relationship configuration
            modelBuilder.Entity<Teacher>()
                .HasRequired(t => t.Faculty) // Each Teacher must belong to a Faculty
                .WithMany(f => f.Teachers) // One Faculty can have many Teachers
                .HasForeignKey(t => t.FacultyID); // Foreign key property

            modelBuilder.Entity<StudySession>()
               .HasRequired(s => s.Student) // StudySession requires a Student
               .WithMany(s => s.StudySessions) // Student can have many StudySessions
               .HasForeignKey(s => s.StudentID); // Foreign key constraint

           

            base.OnModelCreating(modelBuilder);
        }

        public System.Data.Entity.DbSet<LearniVerseNew.Models.ApplicationModels.Trainer_Models.TrainingSession> TrainingSessions { get; set; }
    }
}
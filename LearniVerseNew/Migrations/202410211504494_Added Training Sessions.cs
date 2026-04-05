namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedTrainingSessions : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.TrainingSessions",
                c => new
                    {
                        TrainingSessionID = c.Guid(nullable: false),
                        SessionName = c.String(),
                        SessionStart = c.Time(nullable: false, precision: 7),
                        Duration = c.Int(nullable: false),
                        SessionEnd = c.Time(nullable: false, precision: 7),
                        MaxParticipants = c.Int(nullable: false),
                        TrainerID = c.String(maxLength: 128),
                    })
                .PrimaryKey(t => t.TrainingSessionID)
                .ForeignKey("dbo.Trainers", t => t.TrainerID)
                .Index(t => t.TrainerID);
            
            CreateTable(
                "dbo.TrainingSessionStudents",
                c => new
                    {
                        TrainingSession_TrainingSessionID = c.Guid(nullable: false),
                        Student_StudentID = c.String(nullable: false, maxLength: 128),
                    })
                .PrimaryKey(t => new { t.TrainingSession_TrainingSessionID, t.Student_StudentID })
                .ForeignKey("dbo.TrainingSessions", t => t.TrainingSession_TrainingSessionID, cascadeDelete: true)
                .ForeignKey("dbo.Students", t => t.Student_StudentID, cascadeDelete: true)
                .Index(t => t.TrainingSession_TrainingSessionID)
                .Index(t => t.Student_StudentID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.TrainingSessions", "TrainerID", "dbo.Trainers");
            DropForeignKey("dbo.TrainingSessionStudents", "Student_StudentID", "dbo.Students");
            DropForeignKey("dbo.TrainingSessionStudents", "TrainingSession_TrainingSessionID", "dbo.TrainingSessions");
            DropIndex("dbo.TrainingSessionStudents", new[] { "Student_StudentID" });
            DropIndex("dbo.TrainingSessionStudents", new[] { "TrainingSession_TrainingSessionID" });
            DropIndex("dbo.TrainingSessions", new[] { "TrainerID" });
            DropTable("dbo.TrainingSessionStudents");
            DropTable("dbo.TrainingSessions");
        }
    }
}

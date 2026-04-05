namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class QuizEntitiestoDb : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.QuizAttempts",
                c => new
                    {
                        QuizAttemptID = c.Guid(nullable: false),
                        AttemptDate = c.DateTime(nullable: false),
                        MarkObtained = c.Int(nullable: false),
                        QuizID = c.Guid(nullable: false),
                        StudentID = c.Guid(nullable: false),
                        Student_StudentID = c.String(maxLength: 128),
                    })
                .PrimaryKey(t => t.QuizAttemptID)
                .ForeignKey("dbo.Quizs", t => t.QuizID, cascadeDelete: true)
                .ForeignKey("dbo.Students", t => t.Student_StudentID)
                .Index(t => t.QuizID)
                .Index(t => t.Student_StudentID);
            
            CreateTable(
                "dbo.Quizs",
                c => new
                    {
                        QuizID = c.Guid(nullable: false),
                        QuizDescription = c.String(),
                        QuizMaxMark = c.Int(nullable: false),
                        QuizDate = c.DateTime(nullable: false),
                        QuizDuration = c.Time(nullable: false, precision: 7),
                        DateCreated = c.DateTime(nullable: false),
                        MaxAttempts = c.Int(nullable: false),
                        Status = c.String(),
                        TeacherID = c.Guid(nullable: false),
                        Teacher_TeacherID = c.String(maxLength: 128),
                    })
                .PrimaryKey(t => t.QuizID)
                .ForeignKey("dbo.Teachers", t => t.Teacher_TeacherID)
                .Index(t => t.Teacher_TeacherID);
            
            CreateTable(
                "dbo.Questions",
                c => new
                    {
                        QuestionID = c.Guid(nullable: false),
                        QuestionText = c.String(),
                        AnswerA = c.String(),
                        AnswerB = c.String(),
                        AnswerC = c.String(),
                        AnswerD = c.String(),
                        QuizID = c.Guid(nullable: false),
                    })
                .PrimaryKey(t => t.QuestionID)
                .ForeignKey("dbo.Quizs", t => t.QuizID, cascadeDelete: true)
                .Index(t => t.QuizID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.QuizAttempts", "Student_StudentID", "dbo.Students");
            DropForeignKey("dbo.QuizAttempts", "QuizID", "dbo.Quizs");
            DropForeignKey("dbo.Quizs", "Teacher_TeacherID", "dbo.Teachers");
            DropForeignKey("dbo.Questions", "QuizID", "dbo.Quizs");
            DropIndex("dbo.Questions", new[] { "QuizID" });
            DropIndex("dbo.Quizs", new[] { "Teacher_TeacherID" });
            DropIndex("dbo.QuizAttempts", new[] { "Student_StudentID" });
            DropIndex("dbo.QuizAttempts", new[] { "QuizID" });
            DropTable("dbo.Questions");
            DropTable("dbo.Quizs");
            DropTable("dbo.QuizAttempts");
        }
    }
}

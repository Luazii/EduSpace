namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class FixedDatatypediscrepencies : DbMigration
    {
        public override void Up()
        {
            DropForeignKey("dbo.QuizAttempts", "QuizID", "dbo.Quizs");
            DropIndex("dbo.QuizAttempts", new[] { "QuizID" });
            DropIndex("dbo.QuizAttempts", new[] { "Student_StudentID" });
            DropIndex("dbo.Quizs", new[] { "Course_CourseID" });
            DropColumn("dbo.QuizAttempts", "StudentID");
            DropColumn("dbo.Quizs", "CourseID");
            RenameColumn(table: "dbo.Quizs", name: "Course_CourseID", newName: "CourseID");
            RenameColumn(table: "dbo.QuizAttempts", name: "Student_StudentID", newName: "StudentID");
            AddColumn("dbo.QuizAttempts", "Quiz_QuizID", c => c.Guid());
            AlterColumn("dbo.QuizAttempts", "QuizID", c => c.String());
            AlterColumn("dbo.QuizAttempts", "StudentID", c => c.String(maxLength: 128));
            AlterColumn("dbo.Quizs", "CourseID", c => c.String(maxLength: 128));
            CreateIndex("dbo.QuizAttempts", "StudentID");
            CreateIndex("dbo.QuizAttempts", "Quiz_QuizID");
            CreateIndex("dbo.Quizs", "CourseID");
            AddForeignKey("dbo.QuizAttempts", "Quiz_QuizID", "dbo.Quizs", "QuizID");
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.QuizAttempts", "Quiz_QuizID", "dbo.Quizs");
            DropIndex("dbo.Quizs", new[] { "CourseID" });
            DropIndex("dbo.QuizAttempts", new[] { "Quiz_QuizID" });
            DropIndex("dbo.QuizAttempts", new[] { "StudentID" });
            AlterColumn("dbo.Quizs", "CourseID", c => c.Guid(nullable: false));
            AlterColumn("dbo.QuizAttempts", "StudentID", c => c.Guid(nullable: false));
            AlterColumn("dbo.QuizAttempts", "QuizID", c => c.Guid(nullable: false));
            DropColumn("dbo.QuizAttempts", "Quiz_QuizID");
            RenameColumn(table: "dbo.QuizAttempts", name: "StudentID", newName: "Student_StudentID");
            RenameColumn(table: "dbo.Quizs", name: "CourseID", newName: "Course_CourseID");
            AddColumn("dbo.Quizs", "CourseID", c => c.Guid(nullable: false));
            AddColumn("dbo.QuizAttempts", "StudentID", c => c.Guid(nullable: false));
            CreateIndex("dbo.Quizs", "Course_CourseID");
            CreateIndex("dbo.QuizAttempts", "Student_StudentID");
            CreateIndex("dbo.QuizAttempts", "QuizID");
            AddForeignKey("dbo.QuizAttempts", "QuizID", "dbo.Quizs", "QuizID", cascadeDelete: true);
        }
    }
}

namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class ChangedQuizIDtoGUID : DbMigration
    {
        public override void Up()
        {
            DropForeignKey("dbo.QuizAttempts", "Quiz_QuizID", "dbo.Quizs");
            DropIndex("dbo.QuizAttempts", new[] { "Quiz_QuizID" });
            DropColumn("dbo.QuizAttempts", "QuizID");
            RenameColumn(table: "dbo.QuizAttempts", name: "Quiz_QuizID", newName: "QuizID");
            AlterColumn("dbo.QuizAttempts", "QuizID", c => c.Guid(nullable: false));
            AlterColumn("dbo.QuizAttempts", "QuizID", c => c.Guid(nullable: false));
            CreateIndex("dbo.QuizAttempts", "QuizID");
            AddForeignKey("dbo.QuizAttempts", "QuizID", "dbo.Quizs", "QuizID", cascadeDelete: true);
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.QuizAttempts", "QuizID", "dbo.Quizs");
            DropIndex("dbo.QuizAttempts", new[] { "QuizID" });
            AlterColumn("dbo.QuizAttempts", "QuizID", c => c.Guid());
            AlterColumn("dbo.QuizAttempts", "QuizID", c => c.String());
            RenameColumn(table: "dbo.QuizAttempts", name: "QuizID", newName: "Quiz_QuizID");
            AddColumn("dbo.QuizAttempts", "QuizID", c => c.String());
            CreateIndex("dbo.QuizAttempts", "Quiz_QuizID");
            AddForeignKey("dbo.QuizAttempts", "Quiz_QuizID", "dbo.Quizs", "QuizID");
        }
    }
}

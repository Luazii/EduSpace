namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class Addedquizstartandendtimes : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Quizs", "QuizStart", c => c.Time(nullable: false, precision: 7));
            AddColumn("dbo.Quizs", "QuizEnd", c => c.Time(nullable: false, precision: 7));
            DropColumn("dbo.Quizs", "QuizDuration");
        }
        
        public override void Down()
        {
            AddColumn("dbo.Quizs", "QuizDuration", c => c.Time(nullable: false, precision: 7));
            DropColumn("dbo.Quizs", "QuizEnd");
            DropColumn("dbo.Quizs", "QuizStart");
        }
    }
}

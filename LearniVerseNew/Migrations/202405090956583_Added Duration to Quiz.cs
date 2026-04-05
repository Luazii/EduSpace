namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedDurationtoQuiz : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Quizs", "Duration", c => c.Int(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Quizs", "Duration");
        }
    }
}

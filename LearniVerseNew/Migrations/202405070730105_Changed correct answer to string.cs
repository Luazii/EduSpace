namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class Changedcorrectanswertostring : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Questions", "CorrectAnswer", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.Questions", "CorrectAnswer");
        }
    }
}

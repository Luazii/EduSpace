namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class Addedquestionnumber : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Questions", "QuestionNumber", c => c.Int(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Questions", "QuestionNumber");
        }
    }
}

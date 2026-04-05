namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedweightingtoQuestion : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Questions", "Weighting", c => c.Int(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Questions", "Weighting");
        }
    }
}

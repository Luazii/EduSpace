namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class SetsandRepsAdded : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Exercises", "Sets", c => c.Int(nullable: false));
            AddColumn("dbo.Exercises", "Reps", c => c.Int(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Exercises", "Reps");
            DropColumn("dbo.Exercises", "Sets");
        }
    }
}

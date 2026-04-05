namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class TimesTrained : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Workouts", "TimesTrained", c => c.Int(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Workouts", "TimesTrained");
        }
    }
}

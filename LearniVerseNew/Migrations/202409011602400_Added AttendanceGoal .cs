namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedAttendanceGoal : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Regimen", "AttendanceGoal", c => c.Int(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Regimen", "AttendanceGoal");
        }
    }
}

namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class Addedtimeslotnavtobooking : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Bookings", "TimeSlotID", c => c.Guid(nullable: false));
            CreateIndex("dbo.Bookings", "TimeSlotID");
            AddForeignKey("dbo.Bookings", "TimeSlotID", "dbo.TimeSlots", "TimeSlotID", cascadeDelete: true);
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.Bookings", "TimeSlotID", "dbo.TimeSlots");
            DropIndex("dbo.Bookings", new[] { "TimeSlotID" });
            DropColumn("dbo.Bookings", "TimeSlotID");
        }
    }
}

namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedBookingTables : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Bookings",
                c => new
                    {
                        BookingID = c.Guid(nullable: false),
                        StudentID = c.String(nullable: false, maxLength: 128),
                        RoomID = c.String(nullable: false),
                        BookingDate = c.DateTime(nullable: false),
                    })
                .PrimaryKey(t => t.BookingID)
                .ForeignKey("dbo.Students", t => t.StudentID, cascadeDelete: true)
                .Index(t => t.StudentID);
            
            CreateTable(
                "dbo.Rooms",
                c => new
                    {
                        RoomID = c.String(nullable: false, maxLength: 128),
                        Campus = c.String(nullable: false),
                    })
                .PrimaryKey(t => t.RoomID);
            
            CreateTable(
                "dbo.TimeSlots",
                c => new
                    {
                        TimeSlotID = c.Guid(nullable: false),
                        SlotName = c.String(),
                        StartTime = c.Time(nullable: false, precision: 7),
                        EndTime = c.Time(nullable: false, precision: 7),
                        RoomID = c.String(maxLength: 128),
                    })
                .PrimaryKey(t => t.TimeSlotID)
                .ForeignKey("dbo.Rooms", t => t.RoomID)
                .Index(t => t.RoomID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.TimeSlots", "RoomID", "dbo.Rooms");
            DropForeignKey("dbo.Bookings", "StudentID", "dbo.Students");
            DropIndex("dbo.TimeSlots", new[] { "RoomID" });
            DropIndex("dbo.Bookings", new[] { "StudentID" });
            DropTable("dbo.TimeSlots");
            DropTable("dbo.Rooms");
            DropTable("dbo.Bookings");
        }
    }
}

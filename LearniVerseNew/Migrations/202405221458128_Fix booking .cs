namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class Fixbooking : DbMigration
    {
        public override void Up()
        {
            RenameTable(name: "dbo.EnrollmentCourses", newName: "CourseEnrollments");
            DropPrimaryKey("dbo.CourseEnrollments");
            AlterColumn("dbo.Bookings", "RoomID", c => c.String(nullable: false, maxLength: 128));
            AddPrimaryKey("dbo.CourseEnrollments", new[] { "Course_CourseID", "Enrollment_EnrollmentID" });
            CreateIndex("dbo.Bookings", "RoomID");
            AddForeignKey("dbo.Bookings", "RoomID", "dbo.Rooms", "RoomID", cascadeDelete: true);
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.Bookings", "RoomID", "dbo.Rooms");
            DropIndex("dbo.Bookings", new[] { "RoomID" });
            DropPrimaryKey("dbo.CourseEnrollments");
            AlterColumn("dbo.Bookings", "RoomID", c => c.String(nullable: false));
            AddPrimaryKey("dbo.CourseEnrollments", new[] { "Enrollment_EnrollmentID", "Course_CourseID" });
            RenameTable(name: "dbo.CourseEnrollments", newName: "EnrollmentCourses");
        }
    }
}

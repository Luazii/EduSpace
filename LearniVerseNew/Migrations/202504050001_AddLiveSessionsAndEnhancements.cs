namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;

    public partial class AddLiveSessionsAndEnhancements : DbMigration
    {
        public override void Up()
        {
            // LiveSessions table
            CreateTable(
                "dbo.LiveSessions",
                c => new
                {
                    LiveSessionID = c.Guid(nullable: false),
                    Title        = c.String(nullable: false, maxLength: 200),
                    MeetingUrl   = c.String(nullable: false, maxLength: 500),
                    StartTime    = c.DateTime(nullable: false),
                    EndTime      = c.DateTime(nullable: false),
                    Status       = c.String(maxLength: 20),
                    CourseID     = c.String(maxLength: 128),
                    TeacherID    = c.String(maxLength: 128),
                    CreatedAt    = c.DateTime(nullable: false),
                })
                .PrimaryKey(t => t.LiveSessionID)
                .ForeignKey("dbo.Courses",  t => t.CourseID)
                .ForeignKey("dbo.Teachers", t => t.TeacherID)
                .Index(t => t.CourseID)
                .Index(t => t.TeacherID);

            // Submission enhancements
            AddColumn("dbo.Submissions", "Feedback",  c => c.String());
            AddColumn("dbo.Submissions", "GradedAt",  c => c.DateTime());

            // Assignment enhancement
            AddColumn("dbo.Assignments", "MaxMark", c => c.Int());
        }

        public override void Down()
        {
            DropColumn("dbo.Assignments", "MaxMark");
            DropColumn("dbo.Submissions", "GradedAt");
            DropColumn("dbo.Submissions", "Feedback");

            DropForeignKey("dbo.LiveSessions", "TeacherID", "dbo.Teachers");
            DropForeignKey("dbo.LiveSessions", "CourseID",  "dbo.Courses");
            DropIndex("dbo.LiveSessions", new[] { "TeacherID" });
            DropIndex("dbo.LiveSessions", new[] { "CourseID" });
            DropTable("dbo.LiveSessions");
        }
    }
}

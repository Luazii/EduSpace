namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class Addingstudycenter : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.StudySessions",
                c => new
                    {
                        StudySessionID = c.Guid(nullable: false),
                        SessionDate = c.DateTime(nullable: false),
                        StudentID = c.String(nullable: false, maxLength: 128),
                    })
                .PrimaryKey(t => t.StudySessionID)
                .ForeignKey("dbo.Students", t => t.StudentID, cascadeDelete: true)
                .Index(t => t.StudentID);
            
            CreateTable(
                "dbo.TaskItems",
                c => new
                    {
                        TaskID = c.Guid(nullable: false),
                        Title = c.String(),
                        Description = c.String(),
                        IsComplete = c.Boolean(nullable: false),
                        StudySessionID = c.Guid(nullable: false),
                    })
                .PrimaryKey(t => t.TaskID)
                .ForeignKey("dbo.StudySessions", t => t.StudySessionID, cascadeDelete: true)
                .Index(t => t.StudySessionID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.TaskItems", "StudySessionID", "dbo.StudySessions");
            DropForeignKey("dbo.StudySessions", "StudentID", "dbo.Students");
            DropIndex("dbo.TaskItems", new[] { "StudySessionID" });
            DropIndex("dbo.StudySessions", new[] { "StudentID" });
            DropTable("dbo.TaskItems");
            DropTable("dbo.StudySessions");
        }
    }
}

namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedNSCstuff : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.NSCSubjects",
                c => new
                    {
                        NSCSubjectID = c.Int(nullable: false, identity: true),
                        Subject = c.String(),
                        Marks = c.Decimal(nullable: false, precision: 18, scale: 2),
                        NSCSubmissionID = c.Guid(nullable: false),
                    })
                .PrimaryKey(t => t.NSCSubjectID)
                .ForeignKey("dbo.NSCSubmissions", t => t.NSCSubmissionID, cascadeDelete: true)
                .Index(t => t.NSCSubmissionID);
            
            CreateTable(
                "dbo.NSCSubmissions",
                c => new
                    {
                        NSCSubmissionID = c.Guid(nullable: false),
                        DocumentName = c.String(),
                        DocumentURL = c.String(),
                        SubmissionDate = c.DateTime(nullable: false),
                        Marks = c.Int(nullable: false),
                        Student_StudentID = c.String(maxLength: 128),
                    })
                .PrimaryKey(t => t.NSCSubmissionID)
                .ForeignKey("dbo.Students", t => t.Student_StudentID)
                .Index(t => t.Student_StudentID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.NSCSubjects", "NSCSubmissionID", "dbo.NSCSubmissions");
            DropForeignKey("dbo.NSCSubmissions", "Student_StudentID", "dbo.Students");
            DropIndex("dbo.NSCSubmissions", new[] { "Student_StudentID" });
            DropIndex("dbo.NSCSubjects", new[] { "NSCSubmissionID" });
            DropTable("dbo.NSCSubmissions");
            DropTable("dbo.NSCSubjects");
        }
    }
}

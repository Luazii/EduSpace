namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedStudentFinalMArksTable : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.StudentFinalMarks",
                c => new
                    {
                        ID = c.Guid(nullable: false),
                        StudentID = c.String(maxLength: 128),
                        EnrollmentID = c.Guid(nullable: false),
                        CourseID = c.String(maxLength: 128),
                        FinalMark = c.Double(),
                    })
                .PrimaryKey(t => t.ID)
                .ForeignKey("dbo.Courses", t => t.CourseID)
                .ForeignKey("dbo.Enrollments", t => t.EnrollmentID, cascadeDelete: true)
                .ForeignKey("dbo.Students", t => t.StudentID)
                .Index(t => t.StudentID)
                .Index(t => t.EnrollmentID)
                .Index(t => t.CourseID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.StudentFinalMarks", "StudentID", "dbo.Students");
            DropForeignKey("dbo.StudentFinalMarks", "EnrollmentID", "dbo.Enrollments");
            DropForeignKey("dbo.StudentFinalMarks", "CourseID", "dbo.Courses");
            DropIndex("dbo.StudentFinalMarks", new[] { "CourseID" });
            DropIndex("dbo.StudentFinalMarks", new[] { "EnrollmentID" });
            DropIndex("dbo.StudentFinalMarks", new[] { "StudentID" });
            DropTable("dbo.StudentFinalMarks");
        }
    }
}

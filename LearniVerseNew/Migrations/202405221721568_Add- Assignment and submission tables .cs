namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddAssignmentandsubmissiontables : DbMigration
    {
        public override void Up()
        {
            RenameTable(name: "dbo.CourseEnrollments", newName: "EnrollmentCourses");
            DropPrimaryKey("dbo.EnrollmentCourses");
            CreateTable(
                "dbo.Assignments",
                c => new
                    {
                        AssignmentID = c.Guid(nullable: false),
                        Title = c.String(),
                        Description = c.String(),
                        Deadline = c.DateTime(nullable: false),
                        CourseID = c.String(maxLength: 128),
                        TeacherID = c.String(maxLength: 128),
                    })
                .PrimaryKey(t => t.AssignmentID)
                .ForeignKey("dbo.Courses", t => t.CourseID)
                .ForeignKey("dbo.Teachers", t => t.TeacherID)
                .Index(t => t.CourseID)
                .Index(t => t.TeacherID);
            
            CreateTable(
                "dbo.Submissions",
                c => new
                    {
                        SubmissionID = c.Guid(nullable: false),
                        AssignmentID = c.String(),
                        StudentID = c.String(maxLength: 128),
                        FileName = c.String(),
                        BlobUrl = c.String(),
                        Mark = c.Int(),
                        Assignment_AssignmentID = c.Guid(),
                    })
                .PrimaryKey(t => t.SubmissionID)
                .ForeignKey("dbo.Assignments", t => t.Assignment_AssignmentID)
                .ForeignKey("dbo.Students", t => t.StudentID)
                .Index(t => t.StudentID)
                .Index(t => t.Assignment_AssignmentID);
            
            AddPrimaryKey("dbo.EnrollmentCourses", new[] { "Enrollment_EnrollmentID", "Course_CourseID" });
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.Submissions", "StudentID", "dbo.Students");
            DropForeignKey("dbo.Submissions", "Assignment_AssignmentID", "dbo.Assignments");
            DropForeignKey("dbo.Assignments", "TeacherID", "dbo.Teachers");
            DropForeignKey("dbo.Assignments", "CourseID", "dbo.Courses");
            DropIndex("dbo.Submissions", new[] { "Assignment_AssignmentID" });
            DropIndex("dbo.Submissions", new[] { "StudentID" });
            DropIndex("dbo.Assignments", new[] { "TeacherID" });
            DropIndex("dbo.Assignments", new[] { "CourseID" });
            DropPrimaryKey("dbo.EnrollmentCourses");
            DropTable("dbo.Submissions");
            DropTable("dbo.Assignments");
            AddPrimaryKey("dbo.EnrollmentCourses", new[] { "Course_CourseID", "Enrollment_EnrollmentID" });
            RenameTable(name: "dbo.EnrollmentCourses", newName: "CourseEnrollments");
        }
    }
}

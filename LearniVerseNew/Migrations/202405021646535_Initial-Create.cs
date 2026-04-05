namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class InitialCreate : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Courses",
                c => new
                    {
                        CourseID = c.String(nullable: false, maxLength: 128),
                        CourseName = c.String(nullable: false),
                        Description = c.String(),
                        Semester = c.Int(nullable: false),
                        Department = c.String(nullable: false),
                        Price = c.Decimal(nullable: false, precision: 18, scale: 2),
                        TeacherID = c.String(maxLength: 128),
                        QualificationID = c.String(nullable: false, maxLength: 128),
                    })
                .PrimaryKey(t => t.CourseID)
                .ForeignKey("dbo.Qualifications", t => t.QualificationID, cascadeDelete: true)
                .ForeignKey("dbo.Teachers", t => t.TeacherID)
                .Index(t => t.TeacherID)
                .Index(t => t.QualificationID);
            
            CreateTable(
                "dbo.Enrollments",
                c => new
                    {
                        EnrollmentID = c.Guid(nullable: false),
                        StudentID = c.String(nullable: false, maxLength: 128),
                        IsApproved = c.Boolean(nullable: false),
                        HasPaid = c.Boolean(nullable: false),
                        EnrollmentDate = c.DateTime(nullable: false),
                    })
                .PrimaryKey(t => t.EnrollmentID)
                .ForeignKey("dbo.Students", t => t.StudentID, cascadeDelete: true)
                .Index(t => t.StudentID);
            
            CreateTable(
                "dbo.Students",
                c => new
                    {
                        StudentID = c.String(nullable: false, maxLength: 128),
                        StudentFirstName = c.String(),
                        StudentLastName = c.String(),
                        StudentEmail = c.String(),
                        PhoneNumber = c.String(),
                        Gender = c.String(),
                        DOB = c.DateTime(nullable: false),
                        FacultyID = c.String(maxLength: 128),
                        QualificationID = c.String(maxLength: 128),
                    })
                .PrimaryKey(t => t.StudentID)
                .ForeignKey("dbo.Faculties", t => t.FacultyID)
                .ForeignKey("dbo.Qualifications", t => t.QualificationID)
                .Index(t => t.FacultyID)
                .Index(t => t.QualificationID);
            
            CreateTable(
                "dbo.Faculties",
                c => new
                    {
                        FacultyID = c.String(nullable: false, maxLength: 128),
                        FacultyName = c.String(nullable: false),
                        Description = c.String(),
                    })
                .PrimaryKey(t => t.FacultyID);
            
            CreateTable(
                "dbo.Qualifications",
                c => new
                    {
                        QualificationID = c.String(nullable: false, maxLength: 128),
                        Name = c.String(nullable: false),
                        Description = c.String(),
                        Duration = c.Int(nullable: false),
                        FacultyID = c.String(nullable: false, maxLength: 128),
                    })
                .PrimaryKey(t => t.QualificationID)
                .ForeignKey("dbo.Faculties", t => t.FacultyID, cascadeDelete: true)
                .Index(t => t.FacultyID);
            
            CreateTable(
                "dbo.Teachers",
                c => new
                    {
                        TeacherID = c.String(nullable: false, maxLength: 128),
                        TeacherFirstName = c.String(nullable: false),
                        TeacherLastName = c.String(nullable: false),
                        TeacherEmail = c.String(),
                        TeacherPhoneNumber = c.String(),
                        Gender = c.String(),
                        DOB = c.DateTime(nullable: false),
                        Qualification = c.String(),
                        FacultyID = c.String(nullable: false, maxLength: 128),
                    })
                .PrimaryKey(t => t.TeacherID)
                .ForeignKey("dbo.Faculties", t => t.FacultyID, cascadeDelete: true)
                .Index(t => t.FacultyID);
            
            CreateTable(
                "dbo.Resources",
                c => new
                    {
                        ResourceID = c.Guid(nullable: false),
                        FileName = c.String(),
                        BlobURL = c.String(),
                        FileDescription = c.String(),
                        CourseID = c.String(nullable: false, maxLength: 128),
                    })
                .PrimaryKey(t => t.ResourceID)
                .ForeignKey("dbo.Courses", t => t.CourseID, cascadeDelete: true)
                .Index(t => t.CourseID);
            
            CreateTable(
                "dbo.AspNetRoles",
                c => new
                    {
                        Id = c.String(nullable: false, maxLength: 128),
                        Name = c.String(nullable: false, maxLength: 256),
                    })
                .PrimaryKey(t => t.Id)
                .Index(t => t.Name, unique: true, name: "RoleNameIndex");
            
            CreateTable(
                "dbo.AspNetUserRoles",
                c => new
                    {
                        UserId = c.String(nullable: false, maxLength: 128),
                        RoleId = c.String(nullable: false, maxLength: 128),
                    })
                .PrimaryKey(t => new { t.UserId, t.RoleId })
                .ForeignKey("dbo.AspNetRoles", t => t.RoleId, cascadeDelete: true)
                .ForeignKey("dbo.AspNetUsers", t => t.UserId, cascadeDelete: true)
                .Index(t => t.UserId)
                .Index(t => t.RoleId);
            
            CreateTable(
                "dbo.AspNetUsers",
                c => new
                    {
                        Id = c.String(nullable: false, maxLength: 128),
                        Email = c.String(maxLength: 256),
                        EmailConfirmed = c.Boolean(nullable: false),
                        PasswordHash = c.String(),
                        SecurityStamp = c.String(),
                        PhoneNumber = c.String(),
                        PhoneNumberConfirmed = c.Boolean(nullable: false),
                        TwoFactorEnabled = c.Boolean(nullable: false),
                        LockoutEndDateUtc = c.DateTime(),
                        LockoutEnabled = c.Boolean(nullable: false),
                        AccessFailedCount = c.Int(nullable: false),
                        UserName = c.String(nullable: false, maxLength: 256),
                    })
                .PrimaryKey(t => t.Id)
                .Index(t => t.UserName, unique: true, name: "UserNameIndex");
            
            CreateTable(
                "dbo.AspNetUserClaims",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        UserId = c.String(nullable: false, maxLength: 128),
                        ClaimType = c.String(),
                        ClaimValue = c.String(),
                    })
                .PrimaryKey(t => t.Id)
                .ForeignKey("dbo.AspNetUsers", t => t.UserId, cascadeDelete: true)
                .Index(t => t.UserId);
            
            CreateTable(
                "dbo.AspNetUserLogins",
                c => new
                    {
                        LoginProvider = c.String(nullable: false, maxLength: 128),
                        ProviderKey = c.String(nullable: false, maxLength: 128),
                        UserId = c.String(nullable: false, maxLength: 128),
                    })
                .PrimaryKey(t => new { t.LoginProvider, t.ProviderKey, t.UserId })
                .ForeignKey("dbo.AspNetUsers", t => t.UserId, cascadeDelete: true)
                .Index(t => t.UserId);
            
            CreateTable(
                "dbo.EnrollmentCourses",
                c => new
                    {
                        Enrollment_EnrollmentID = c.Guid(nullable: false),
                        Course_CourseID = c.String(nullable: false, maxLength: 128),
                    })
                .PrimaryKey(t => new { t.Enrollment_EnrollmentID, t.Course_CourseID })
                .ForeignKey("dbo.Enrollments", t => t.Enrollment_EnrollmentID, cascadeDelete: true)
                .ForeignKey("dbo.Courses", t => t.Course_CourseID, cascadeDelete: true)
                .Index(t => t.Enrollment_EnrollmentID)
                .Index(t => t.Course_CourseID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.AspNetUserRoles", "UserId", "dbo.AspNetUsers");
            DropForeignKey("dbo.AspNetUserLogins", "UserId", "dbo.AspNetUsers");
            DropForeignKey("dbo.AspNetUserClaims", "UserId", "dbo.AspNetUsers");
            DropForeignKey("dbo.AspNetUserRoles", "RoleId", "dbo.AspNetRoles");
            DropForeignKey("dbo.Courses", "TeacherID", "dbo.Teachers");
            DropForeignKey("dbo.Resources", "CourseID", "dbo.Courses");
            DropForeignKey("dbo.Courses", "QualificationID", "dbo.Qualifications");
            DropForeignKey("dbo.Enrollments", "StudentID", "dbo.Students");
            DropForeignKey("dbo.Students", "QualificationID", "dbo.Qualifications");
            DropForeignKey("dbo.Students", "FacultyID", "dbo.Faculties");
            DropForeignKey("dbo.Teachers", "FacultyID", "dbo.Faculties");
            DropForeignKey("dbo.Qualifications", "FacultyID", "dbo.Faculties");
            DropForeignKey("dbo.EnrollmentCourses", "Course_CourseID", "dbo.Courses");
            DropForeignKey("dbo.EnrollmentCourses", "Enrollment_EnrollmentID", "dbo.Enrollments");
            DropIndex("dbo.EnrollmentCourses", new[] { "Course_CourseID" });
            DropIndex("dbo.EnrollmentCourses", new[] { "Enrollment_EnrollmentID" });
            DropIndex("dbo.AspNetUserLogins", new[] { "UserId" });
            DropIndex("dbo.AspNetUserClaims", new[] { "UserId" });
            DropIndex("dbo.AspNetUsers", "UserNameIndex");
            DropIndex("dbo.AspNetUserRoles", new[] { "RoleId" });
            DropIndex("dbo.AspNetUserRoles", new[] { "UserId" });
            DropIndex("dbo.AspNetRoles", "RoleNameIndex");
            DropIndex("dbo.Resources", new[] { "CourseID" });
            DropIndex("dbo.Teachers", new[] { "FacultyID" });
            DropIndex("dbo.Qualifications", new[] { "FacultyID" });
            DropIndex("dbo.Students", new[] { "QualificationID" });
            DropIndex("dbo.Students", new[] { "FacultyID" });
            DropIndex("dbo.Enrollments", new[] { "StudentID" });
            DropIndex("dbo.Courses", new[] { "QualificationID" });
            DropIndex("dbo.Courses", new[] { "TeacherID" });
            DropTable("dbo.EnrollmentCourses");
            DropTable("dbo.AspNetUserLogins");
            DropTable("dbo.AspNetUserClaims");
            DropTable("dbo.AspNetUsers");
            DropTable("dbo.AspNetUserRoles");
            DropTable("dbo.AspNetRoles");
            DropTable("dbo.Resources");
            DropTable("dbo.Teachers");
            DropTable("dbo.Qualifications");
            DropTable("dbo.Faculties");
            DropTable("dbo.Students");
            DropTable("dbo.Enrollments");
            DropTable("dbo.Courses");
        }
    }
}

namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class PaymentTableAddedForReal : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Payments",
                c => new
                    {
                        PaymentID = c.Int(nullable: false, identity: true),
                        StudentID = c.String(nullable: false, maxLength: 128),
                        EnrollmentID = c.Guid(nullable: false),
                        AmountPaid = c.Decimal(nullable: false, precision: 18, scale: 2),
                        PaymentReference = c.String(nullable: false),
                        PaymentDate = c.DateTime(nullable: false),
                    })
                .PrimaryKey(t => t.PaymentID)
                .ForeignKey("dbo.Enrollments", t => t.EnrollmentID, cascadeDelete: false)
                .ForeignKey("dbo.Students", t => t.StudentID, cascadeDelete: false)
                .Index(t => t.StudentID)
                .Index(t => t.EnrollmentID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.Payments", "StudentID", "dbo.Students");
            DropForeignKey("dbo.Payments", "EnrollmentID", "dbo.Enrollments");
            DropIndex("dbo.Payments", new[] { "EnrollmentID" });
            DropIndex("dbo.Payments", new[] { "StudentID" });
            DropTable("dbo.Payments");
        }
    }
}

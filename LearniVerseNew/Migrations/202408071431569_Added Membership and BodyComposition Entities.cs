namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedMembershipandBodyCompositionEntities : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.BodyComposistions",
                c => new
                    {
                        BodyCompositionID = c.Guid(nullable: false),
                        DateRecorded = c.DateTime(nullable: false),
                        Height = c.Double(nullable: false),
                        Weight = c.Double(nullable: false),
                        BMI = c.Double(nullable: false),
                        Status = c.String(),
                        BMR = c.Double(nullable: false),
                        BodyFatPercentage = c.Int(nullable: false),
                        LeanMuscleMass = c.Double(nullable: false),
                        StudentID = c.String(maxLength: 128),
                    })
                .PrimaryKey(t => t.BodyCompositionID)
                .ForeignKey("dbo.Students", t => t.StudentID)
                .Index(t => t.StudentID);
            
            CreateTable(
                "dbo.Memberships",
                c => new
                    {
                        MembershipID = c.Guid(nullable: false),
                        MembershipTier = c.String(),
                        MembershipStart = c.DateTime(nullable: false),
                        MembershipEnd = c.DateTime(nullable: false),
                        MembershipDuration = c.Int(nullable: false),
                        MembershipPrice = c.Decimal(nullable: false, precision: 18, scale: 2),
                        HasPaid = c.Boolean(nullable: false),
                        IsActive = c.Boolean(nullable: false),
                        StudentID = c.String(maxLength: 128),
                    })
                .PrimaryKey(t => t.MembershipID)
                .ForeignKey("dbo.Students", t => t.StudentID)
                .Index(t => t.StudentID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.Memberships", "StudentID", "dbo.Students");
            DropForeignKey("dbo.BodyComposistions", "StudentID", "dbo.Students");
            DropIndex("dbo.Memberships", new[] { "StudentID" });
            DropIndex("dbo.BodyComposistions", new[] { "StudentID" });
            DropTable("dbo.Memberships");
            DropTable("dbo.BodyComposistions");
        }
    }
}

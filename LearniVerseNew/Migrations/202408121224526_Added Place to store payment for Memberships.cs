namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedPlacetostorepaymentforMemberships : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.MembershipPayments",
                c => new
                    {
                        PaymentID = c.Guid(nullable: false),
                        StudentID = c.String(maxLength: 128),
                        MembershipID = c.Guid(nullable: false),
                        Amount = c.Decimal(nullable: false, precision: 18, scale: 2),
                        CustomerCode = c.String(),
                        PlanCode = c.String(),
                        Status = c.String(),
                        TransactionDate = c.DateTime(nullable: false),
                    })
                .PrimaryKey(t => t.PaymentID)
                .ForeignKey("dbo.Memberships", t => t.MembershipID, cascadeDelete: true)
                .ForeignKey("dbo.Students", t => t.StudentID)
                .Index(t => t.StudentID)
                .Index(t => t.MembershipID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.MembershipPayments", "StudentID", "dbo.Students");
            DropForeignKey("dbo.MembershipPayments", "MembershipID", "dbo.Memberships");
            DropIndex("dbo.MembershipPayments", new[] { "MembershipID" });
            DropIndex("dbo.MembershipPayments", new[] { "StudentID" });
            DropTable("dbo.MembershipPayments");
        }
    }
}

namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class Subcanceltableadded : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.SubscriptionCancellationRequests",
                c => new
                    {
                        RequestID = c.Guid(nullable: false),
                        StudentID = c.String(maxLength: 128),
                        MembershipID = c.Guid(nullable: false),
                        RequestDate = c.DateTime(nullable: false),
                        RequestStatus = c.String(),
                        Reason = c.String(),
                    })
                .PrimaryKey(t => t.RequestID)
                .ForeignKey("dbo.Memberships", t => t.RequestID)
                .ForeignKey("dbo.Students", t => t.StudentID)
                .Index(t => t.RequestID)
                .Index(t => t.StudentID);
            
            AddColumn("dbo.Memberships", "RequestID", c => c.Guid());
            DropColumn("dbo.Memberships", "CancelRequested");
        }
        
        public override void Down()
        {
            AddColumn("dbo.Memberships", "CancelRequested", c => c.Boolean(nullable: false));
            DropForeignKey("dbo.SubscriptionCancellationRequests", "StudentID", "dbo.Students");
            DropForeignKey("dbo.SubscriptionCancellationRequests", "RequestID", "dbo.Memberships");
            DropIndex("dbo.SubscriptionCancellationRequests", new[] { "StudentID" });
            DropIndex("dbo.SubscriptionCancellationRequests", new[] { "RequestID" });
            DropColumn("dbo.Memberships", "RequestID");
            DropTable("dbo.SubscriptionCancellationRequests");
        }
    }
}

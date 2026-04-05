namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedTrackingHistory : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.OrderTrackingHistories",
                c => new
                    {
                        TrackingID = c.Guid(nullable: false),
                        OrderID = c.Guid(nullable: false),
                        TrackingStage = c.String(nullable: false, maxLength: 50),
                        Timestamp = c.DateTime(nullable: false),
                        UpdatedBy = c.String(nullable: false, maxLength: 50),
                    })
                .PrimaryKey(t => t.TrackingID)
                .ForeignKey("dbo.Orders", t => t.OrderID, cascadeDelete: true)
                .Index(t => t.OrderID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.OrderTrackingHistories", "OrderID", "dbo.Orders");
            DropIndex("dbo.OrderTrackingHistories", new[] { "OrderID" });
            DropTable("dbo.OrderTrackingHistories");
        }
    }
}

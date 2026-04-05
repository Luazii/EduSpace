namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedNotificationsfForLowstock : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.AdminNotifications",
                c => new
                    {
                        NotificationID = c.Guid(nullable: false),
                        Message = c.String(nullable: false),
                        CreatedAt = c.DateTime(nullable: false),
                        IsRead = c.Boolean(nullable: false),
                        ProductID = c.Guid(nullable: false),
                    })
                .PrimaryKey(t => t.NotificationID)
                .ForeignKey("dbo.Products", t => t.ProductID, cascadeDelete: true)
                .Index(t => t.ProductID);
            
            AddColumn("dbo.Products", "LowStockThreshold", c => c.Int(nullable: false));
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.AdminNotifications", "ProductID", "dbo.Products");
            DropIndex("dbo.AdminNotifications", new[] { "ProductID" });
            DropColumn("dbo.Products", "LowStockThreshold");
            DropTable("dbo.AdminNotifications");
        }
    }
}

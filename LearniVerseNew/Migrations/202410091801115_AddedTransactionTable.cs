namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedTransactionTable : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Transactions",
                c => new
                    {
                        TransactionID = c.Guid(nullable: false),
                        OrderID = c.Guid(nullable: false),
                        Amount = c.Decimal(nullable: false, precision: 18, scale: 2),
                        Status = c.String(),
                        TransactionDate = c.DateTime(nullable: false),
                        PaystackReference = c.String(),
                    })
                .PrimaryKey(t => t.TransactionID)
                .ForeignKey("dbo.Orders", t => t.OrderID, cascadeDelete: true)
                .Index(t => t.OrderID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.Transactions", "OrderID", "dbo.Orders");
            DropIndex("dbo.Transactions", new[] { "OrderID" });
            DropTable("dbo.Transactions");
        }
    }
}

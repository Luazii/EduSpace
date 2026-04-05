namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class ProductReviewadded : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.ProductReviews",
                c => new
                    {
                        ReviewID = c.Guid(nullable: false),
                        ReviewerName = c.String(),
                        ReviewText = c.String(),
                        Rating = c.Int(nullable: false),
                        ReviewDate = c.DateTime(nullable: false),
                        ProductID = c.Guid(nullable: false),
                    })
                .PrimaryKey(t => t.ReviewID)
                .ForeignKey("dbo.Products", t => t.ProductID, cascadeDelete: true)
                .Index(t => t.ProductID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.ProductReviews", "ProductID", "dbo.Products");
            DropIndex("dbo.ProductReviews", new[] { "ProductID" });
            DropTable("dbo.ProductReviews");
        }
    }
}

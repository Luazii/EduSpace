namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedCategoryTable : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Categories",
                c => new
                    {
                        CategoryID = c.Guid(nullable: false),
                        CategoryName = c.String(),
                    })
                .PrimaryKey(t => t.CategoryID);
            
            AddColumn("dbo.Products", "CategoryID", c => c.Guid(nullable: false));
            CreateIndex("dbo.Products", "CategoryID");
            AddForeignKey("dbo.Products", "CategoryID", "dbo.Categories", "CategoryID", cascadeDelete: true);
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.Products", "CategoryID", "dbo.Categories");
            DropIndex("dbo.Products", new[] { "CategoryID" });
            DropColumn("dbo.Products", "CategoryID");
            DropTable("dbo.Categories");
        }
    }
}

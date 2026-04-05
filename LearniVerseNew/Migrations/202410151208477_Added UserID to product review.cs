namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedUserIDtoproductreview : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.ProductReviews", "UserID", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.ProductReviews", "UserID");
        }
    }
}

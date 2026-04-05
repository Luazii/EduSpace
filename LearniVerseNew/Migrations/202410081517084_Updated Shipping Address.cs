namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class UpdatedShippingAddress : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Orders", "City", c => c.String(nullable: false));
            AddColumn("dbo.Orders", "State", c => c.String(nullable: false));
            AddColumn("dbo.Orders", "PostalCode", c => c.String(nullable: false));
            AlterColumn("dbo.Orders", "ShippingAddress", c => c.String(nullable: false));
        }
        
        public override void Down()
        {
            AlterColumn("dbo.Orders", "ShippingAddress", c => c.String());
            DropColumn("dbo.Orders", "PostalCode");
            DropColumn("dbo.Orders", "State");
            DropColumn("dbo.Orders", "City");
        }
    }
}

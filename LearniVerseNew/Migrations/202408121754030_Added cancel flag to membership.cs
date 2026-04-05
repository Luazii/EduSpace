namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class Addedcancelflagtomembership : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Memberships", "CancelRequested", c => c.Boolean(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Memberships", "CancelRequested");
        }
    }
}

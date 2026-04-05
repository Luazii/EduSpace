namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedDateCreated : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Regimen", "DateCreated", c => c.DateTime(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Regimen", "DateCreated");
        }
    }
}

namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class RandomFix : DbMigration
    {
        public override void Up()
        {
            AlterColumn("dbo.Regimen", "Name", c => c.String(nullable: false));
        }
        
        public override void Down()
        {
            AlterColumn("dbo.Regimen", "Name", c => c.String());
        }
    }
}

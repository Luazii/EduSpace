namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedPlanCodefromPaystacktoDatabase : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Plans", "PlanCode", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.Plans", "PlanCode");
        }
    }
}

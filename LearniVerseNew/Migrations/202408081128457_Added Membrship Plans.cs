namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedMembrshipPlans : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Plans",
                c => new
                    {
                        PlanID = c.Guid(nullable: false),
                        PlanName = c.String(),
                        PlanDuration = c.Int(nullable: false),
                        PlanCost = c.Decimal(nullable: false, precision: 18, scale: 2),
                    })
                .PrimaryKey(t => t.PlanID);
            
            AddColumn("dbo.Memberships", "PlanID", c => c.Guid(nullable: false));
            CreateIndex("dbo.Memberships", "PlanID");
            AddForeignKey("dbo.Memberships", "PlanID", "dbo.Plans", "PlanID", cascadeDelete: true);
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.Memberships", "PlanID", "dbo.Plans");
            DropIndex("dbo.Memberships", new[] { "PlanID" });
            DropColumn("dbo.Memberships", "PlanID");
            DropTable("dbo.Plans");
        }
    }
}

namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedIsRejectedtoenrollments : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Enrollments", "IsRejected", c => c.Boolean(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Enrollments", "IsRejected");
        }
    }
}

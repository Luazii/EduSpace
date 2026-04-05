namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class Addedtrainertabletodb : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Trainers",
                c => new
                    {
                        TrainerID = c.String(nullable: false, maxLength: 128),
                        FirstName = c.String(nullable: false),
                        LastName = c.String(nullable: false),
                        Email = c.String(nullable: false),
                        Gender = c.String(nullable: false),
                        PhoneNumber = c.String(),
                        Specialization = c.String(nullable: false),
                    })
                .PrimaryKey(t => t.TrainerID);
            
        }
        
        public override void Down()
        {
            DropTable("dbo.Trainers");
        }
    }
}

namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedTrainingACtivities : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.TrainingActivities",
                c => new
                    {
                        ActivityID = c.Guid(nullable: false),
                        ActivityName = c.String(),
                        DefaultStartTime = c.Time(nullable: false, precision: 7),
                        DafaultDuration = c.Int(nullable: false),
                        TrainerID = c.String(maxLength: 128),
                    })
                .PrimaryKey(t => t.ActivityID)
                .ForeignKey("dbo.Trainers", t => t.TrainerID)
                .Index(t => t.TrainerID);
            
            AddColumn("dbo.TrainingSessions", "SessionDate", c => c.DateTime(nullable: false));
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.TrainingActivities", "TrainerID", "dbo.Trainers");
            DropIndex("dbo.TrainingActivities", new[] { "TrainerID" });
            DropColumn("dbo.TrainingSessions", "SessionDate");
            DropTable("dbo.TrainingActivities");
        }
    }
}

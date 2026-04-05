namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedModelsforWorkoutPlanner : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Regimen",
                c => new
                    {
                        RegimenID = c.Guid(nullable: false),
                        Name = c.String(),
                        StudentID = c.String(maxLength: 128),
                    })
                .PrimaryKey(t => t.RegimenID)
                .ForeignKey("dbo.Students", t => t.StudentID)
                .Index(t => t.StudentID);
            
            CreateTable(
                "dbo.Workouts",
                c => new
                    {
                        WorkoutID = c.Guid(nullable: false),
                        Name = c.String(),
                        DayOfWeek = c.Int(nullable: false),
                        RegimenID = c.Guid(nullable: false),
                    })
                .PrimaryKey(t => t.WorkoutID)
                .ForeignKey("dbo.Regimen", t => t.RegimenID, cascadeDelete: true)
                .Index(t => t.RegimenID);
            
            CreateTable(
                "dbo.Exercises",
                c => new
                    {
                        ExceciseID = c.Guid(nullable: false),
                        Name = c.String(),
                        TargetMuscle = c.String(),
                        Equipment = c.String(),
                        Difficulty = c.String(),
                        Instructions = c.String(),
                        WorkoutID = c.Guid(nullable: false),
                    })
                .PrimaryKey(t => t.ExceciseID)
                .ForeignKey("dbo.Workouts", t => t.WorkoutID, cascadeDelete: true)
                .Index(t => t.WorkoutID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.Workouts", "RegimenID", "dbo.Regimen");
            DropForeignKey("dbo.Exercises", "WorkoutID", "dbo.Workouts");
            DropForeignKey("dbo.Regimen", "StudentID", "dbo.Students");
            DropIndex("dbo.Exercises", new[] { "WorkoutID" });
            DropIndex("dbo.Workouts", new[] { "RegimenID" });
            DropIndex("dbo.Regimen", new[] { "StudentID" });
            DropTable("dbo.Exercises");
            DropTable("dbo.Workouts");
            DropTable("dbo.Regimen");
        }
    }
}

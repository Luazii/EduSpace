namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedWorkoutGoalTable : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.WorkoutGoals",
                c => new
                    {
                        GoalID = c.Guid(nullable: false),
                        GoalName = c.String(),
                        GoalDescription = c.String(),
                        GoalCount = c.Int(nullable: false),
                        DateCreated = c.DateTime(nullable: false),
                        IsCompleted = c.Boolean(nullable: false),
                        StudentID = c.String(maxLength: 128),
                        WorkoutID = c.Guid(nullable: false),
                    })
                .PrimaryKey(t => t.GoalID)
                .ForeignKey("dbo.Students", t => t.StudentID)
                .ForeignKey("dbo.Workouts", t => t.WorkoutID, cascadeDelete: true)
                .Index(t => t.StudentID)
                .Index(t => t.WorkoutID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.WorkoutGoals", "WorkoutID", "dbo.Workouts");
            DropForeignKey("dbo.WorkoutGoals", "StudentID", "dbo.Students");
            DropIndex("dbo.WorkoutGoals", new[] { "WorkoutID" });
            DropIndex("dbo.WorkoutGoals", new[] { "StudentID" });
            DropTable("dbo.WorkoutGoals");
        }
    }
}

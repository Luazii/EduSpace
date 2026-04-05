namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedModelsforMealPlanner : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.FoodRecords",
                c => new
                    {
                        FoodRecordID = c.Guid(nullable: false),
                        DateRecorded = c.DateTime(nullable: false),
                        StudentID = c.String(maxLength: 128),
                    })
                .PrimaryKey(t => t.FoodRecordID)
                .ForeignKey("dbo.Students", t => t.StudentID)
                .Index(t => t.StudentID);
            
            CreateTable(
                "dbo.Meals",
                c => new
                    {
                        MealID = c.Guid(nullable: false),
                        Name = c.String(),
                        FoodRecordID = c.Guid(nullable: false),
                    })
                .PrimaryKey(t => t.MealID)
                .ForeignKey("dbo.FoodRecords", t => t.FoodRecordID, cascadeDelete: true)
                .Index(t => t.FoodRecordID);
            
            CreateTable(
                "dbo.FoodItems",
                c => new
                    {
                        FoodItemID = c.Guid(nullable: false),
                        FoodName = c.String(),
                        ServingSize = c.Double(nullable: false),
                        ServingWeightInGrams = c.Int(nullable: false),
                        CaloriesPerServing = c.Double(nullable: false),
                        Protein = c.Double(nullable: false),
                        Carbohydrates = c.Double(nullable: false),
                        Fats = c.Double(nullable: false),
                        Meal_MealID = c.Guid(),
                    })
                .PrimaryKey(t => t.FoodItemID)
                .ForeignKey("dbo.Meals", t => t.Meal_MealID)
                .Index(t => t.Meal_MealID);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.FoodRecords", "StudentID", "dbo.Students");
            DropForeignKey("dbo.Meals", "FoodRecordID", "dbo.FoodRecords");
            DropForeignKey("dbo.FoodItems", "Meal_MealID", "dbo.Meals");
            DropIndex("dbo.FoodItems", new[] { "Meal_MealID" });
            DropIndex("dbo.Meals", new[] { "FoodRecordID" });
            DropIndex("dbo.FoodRecords", new[] { "StudentID" });
            DropTable("dbo.FoodItems");
            DropTable("dbo.Meals");
            DropTable("dbo.FoodRecords");
        }
    }
}

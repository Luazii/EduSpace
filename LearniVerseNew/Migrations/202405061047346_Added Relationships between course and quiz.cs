namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddedRelationshipsbetweencourseandquiz : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Quizs", "CourseID", c => c.Guid(nullable: false));
            AddColumn("dbo.Quizs", "Course_CourseID", c => c.String(maxLength: 128));
            CreateIndex("dbo.Quizs", "Course_CourseID");
            AddForeignKey("dbo.Quizs", "Course_CourseID", "dbo.Courses", "CourseID");
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.Quizs", "Course_CourseID", "dbo.Courses");
            DropIndex("dbo.Quizs", new[] { "Course_CourseID" });
            DropColumn("dbo.Quizs", "Course_CourseID");
            DropColumn("dbo.Quizs", "CourseID");
        }
    }
}

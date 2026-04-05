namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class ChangedteacherIDdatatypeforquiztostring : DbMigration
    {
        public override void Up()
        {
            DropIndex("dbo.Quizs", new[] { "Teacher_TeacherID" });
            DropColumn("dbo.Quizs", "TeacherID");
            RenameColumn(table: "dbo.Quizs", name: "Teacher_TeacherID", newName: "TeacherID");
            AlterColumn("dbo.Quizs", "TeacherID", c => c.String(maxLength: 128));
            CreateIndex("dbo.Quizs", "TeacherID");
        }
        
        public override void Down()
        {
            DropIndex("dbo.Quizs", new[] { "TeacherID" });
            AlterColumn("dbo.Quizs", "TeacherID", c => c.Guid(nullable: false));
            RenameColumn(table: "dbo.Quizs", name: "TeacherID", newName: "Teacher_TeacherID");
            AddColumn("dbo.Quizs", "TeacherID", c => c.Guid(nullable: false));
            CreateIndex("dbo.Quizs", "Teacher_TeacherID");
        }
    }
}

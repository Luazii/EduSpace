namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class FilenameinSubmission : DbMigration
    {
        public override void Up()
        {
            DropForeignKey("dbo.Submissions", "Assignment_AssignmentID", "dbo.Assignments");
            DropIndex("dbo.Submissions", new[] { "Assignment_AssignmentID" });
            DropColumn("dbo.Submissions", "AssignmentID");
            RenameColumn(table: "dbo.Submissions", name: "Assignment_AssignmentID", newName: "AssignmentID");
            AlterColumn("dbo.Submissions", "AssignmentID", c => c.Guid(nullable: false));
            AlterColumn("dbo.Submissions", "AssignmentID", c => c.Guid(nullable: false));
            CreateIndex("dbo.Submissions", "AssignmentID");
            AddForeignKey("dbo.Submissions", "AssignmentID", "dbo.Assignments", "AssignmentID", cascadeDelete: true);
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.Submissions", "AssignmentID", "dbo.Assignments");
            DropIndex("dbo.Submissions", new[] { "AssignmentID" });
            AlterColumn("dbo.Submissions", "AssignmentID", c => c.Guid());
            AlterColumn("dbo.Submissions", "AssignmentID", c => c.String());
            RenameColumn(table: "dbo.Submissions", name: "AssignmentID", newName: "Assignment_AssignmentID");
            AddColumn("dbo.Submissions", "AssignmentID", c => c.String());
            CreateIndex("dbo.Submissions", "Assignment_AssignmentID");
            AddForeignKey("dbo.Submissions", "Assignment_AssignmentID", "dbo.Assignments", "AssignmentID");
        }
    }
}

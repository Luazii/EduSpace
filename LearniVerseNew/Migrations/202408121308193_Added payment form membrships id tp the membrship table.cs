namespace LearniVerseNew.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class Addedpaymentformmembrshipsidtpthemembrshiptable : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Memberships", "PaymentID", c => c.Guid(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Memberships", "PaymentID");
        }
    }
}

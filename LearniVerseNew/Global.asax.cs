using LearniVerseNew.Models;
using Microsoft.AspNet.Identity.EntityFramework;
using Microsoft.AspNet.Identity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;

namespace LearniVerseNew
{
    public class MvcApplication : System.Web.HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            BundleConfig.RegisterBundles(BundleTable.Bundles);
            CreateAdminUserAndRoles();
        }

        private void CreateAdminUserAndRoles()
        {
            ApplicationDbContext context = new ApplicationDbContext();

            var roleManager = new RoleManager<IdentityRole>(new RoleStore<IdentityRole>(context));
            var userManager = new UserManager<ApplicationUser>(new UserStore<ApplicationUser>(context));

            // Create roles if they don't exist
            var roles = new[] { "Admin", "User", "Teacher","WareHouseAdmin","PersonalTrainer" }; 
            foreach (var role in roles)
            {
                if (!roleManager.RoleExists(role))
                {
                    var roleResult = roleManager.Create(new IdentityRole(role));
                    if (!roleResult.Succeeded)
                    {
                        throw new Exception($"Failed to create role: {role}");
                    }
                }
            }

            // Create admin user if it doesn't exist
            var adminEmail = "Admin@admin.com"; // Change as needed
            var adminUser = userManager.FindByEmail(adminEmail);
            if (adminUser == null)
            {
                adminUser = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail
                };
                var result = userManager.Create(adminUser, "Admin1234."); // Change the password as needed
                if (!result.Succeeded)
                {
                    throw new Exception($"Failed to create admin user: {result.Errors}");
                }

                // Assign admin role to the admin user
                result = userManager.AddToRole(adminUser.Id, "Admin");
                if (!result.Succeeded)
                {
                    throw new Exception($"Failed to assign role to admin user: {result.Errors}");
                }
            }

            // Create warehouse admin user if it doesn't exist
            var WarehouseadminEmail = "Warehouse@admin.com"; // Change as needed
            var WareHouseadminUser = userManager.FindByEmail(WarehouseadminEmail);
            if (WareHouseadminUser == null)
            {
                WareHouseadminUser = new ApplicationUser
                {
                    UserName = WarehouseadminEmail, // Use WarehouseadminEmail
                    Email = WarehouseadminEmail // Use WarehouseadminEmail
                };
                var result = userManager.Create(WareHouseadminUser, "Warehouse1234."); // Change the password as needed
                if (!result.Succeeded)
                {
                    throw new Exception($"Failed to create admin user: {result.Errors.FirstOrDefault()}");
                }

                // Assign WarehouseAdmin role to the new warehouse admin user
                result = userManager.AddToRole(WareHouseadminUser.Id, "WarehouseAdmin");
                if (!result.Succeeded)
                {
                    throw new Exception($"Failed to assign role to warehouse admin user: {result.Errors.FirstOrDefault()}");
                }
            }
        }
    }
}

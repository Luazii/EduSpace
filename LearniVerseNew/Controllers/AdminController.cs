using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels.ViewModels;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace LearniVerseNew.Controllers
{
    public class AdminController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        [Authorize(Roles = "Admin")]
        public ActionResult Home()
        {
            var payments = db.Payments
                            .Select(p => new {
                                p.PaymentID,
                                p.AmountPaid,
                                p.PaymentDate
                            })
                            .ToList();

            var settings = new JsonSerializerSettings
            {
                ReferenceLoopHandling = ReferenceLoopHandling.Ignore
            };

            var jsonPayments = JsonConvert.SerializeObject(payments, settings);

            var viewModel = new AdminViewModel
            {
                StudentCount = GetStudentCount(),
                CourseCount = GetCourseCount(),
                TeacherCount = GetTeacherCount(),
                JsonPayments = jsonPayments,
                UnreadNotificationsCount = GetUnreadNotificationsCount()
            };

            return View(viewModel);
        }

        public ActionResult Notifications(string filter = "Unread")
        {
            var notifications = db.AdminNotifications.AsQueryable();

            // Filter notifications based on the filter type
            switch (filter)
            {
                case "Unread":
                    notifications = notifications.Where(n => !n.IsRead);
                    break;
                case "Read":
                    notifications = notifications.Where(n => n.IsRead);
                    break;
                case "All":
                default:
                    break; // Do not apply any filtering, show all notifications
            }

            // Store the notifications and current filter in ViewBag
            ViewBag.Notifications = notifications.OrderByDescending(n => n.CreatedAt).ToList();
            ViewBag.CurrentFilter = filter;

            return View();
        }



        [HttpPost]
        public ActionResult MarkAsRead(Guid notificationId)
        {
            var notification = db.AdminNotifications.Find(notificationId);
            if (notification != null)
            {
                notification.IsRead = true;
                db.Entry(notification).State = EntityState.Modified;
                db.SaveChanges();
            }
            return RedirectToAction("Notifications");
        }

        private int GetUnreadNotificationsCount()
        {
            return db.AdminNotifications.Count(n => !n.IsRead);
        }
        private int GetStudentCount()
        {
            // Implement logic to get the count of students
            return db.Students.Count();
        }

        private int GetCourseCount()
        {
            // Implement logic to get the count of courses
            return db.Courses.Count();
        }

        private int GetTeacherCount()
        {
            // Implement logic to get the count of teachers
            return db.Teachers.Count();
        }

        [Authorize(Roles ="WareHouseAdmin")]
        public ActionResult WarehouseDashboard()
        {
            var totalOrdersByDay = db.Orders
                                    .GroupBy(o => DbFunctions.TruncateTime(o.DateOrdered))
                                    .Select(g => new TotalOrdersByDay
                                    {
                                        Date = g.Key,
                                        TotalOrders = g.Count()
                                    })
                                    .ToList();


            // Fetch the latest 5 orders
            var latestOrders = db.Orders
                                 .OrderByDescending(o => o.DateOrdered)
                                 .Take(5)
                                 .ToList();

            // Fetch unscanned orders
            var unscannedOrders = db.Orders
                                    .Where(o => o.Status == "Sent-To-Warehouse")
                                    .ToList();

            var atWarehouseOrders = db.Orders
                              .Where(o => o.Status == "At-Warehouse")
                              .ToList();

            var outForDeliveryOrders = db.Orders.Where(o => o.Status == "Out-For-Delivery").ToList();


            // Pass data to view
            var model = new WarehouseDashboardViewModel
            {
                OrdersByDay = totalOrdersByDay,
                LatestOrders = latestOrders,
                UnscannedOrders = unscannedOrders,
                AtWarehouseOrders = atWarehouseOrders,
                OutForDeliveryOrders = outForDeliveryOrders
            };

            return View(model);
        }
    }
}
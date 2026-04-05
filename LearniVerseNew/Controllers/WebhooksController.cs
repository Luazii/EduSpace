using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels.Store_Models;
using LearniVerseNew.Models.Helpers;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;

namespace LearniVerseNew.Controllers
{
    
    public class WebhooksController : Controller
    {
        private readonly ApplicationDbContext db = new ApplicationDbContext();

        [HttpPost]
        public async Task<ActionResult> PaystackWebhook()
        {
            var json = await new StreamReader(HttpContext.Request.InputStream).ReadToEndAsync();
            var webhookEvent = JsonConvert.DeserializeObject<PaystackWebhookEvent>(json); 

            if(webhookEvent.Event != "refund.processed")
            {
                return new HttpStatusCodeResult(HttpStatusCode.OK);
            }
            // Process the event
            if (webhookEvent.Event == "refund.processed")
            {
                
                var transaction = await db.Transactions.Include(to => to.Order).FirstOrDefaultAsync(t => t.PaystackReference == webhookEvent.Data.TransactionReference && t.TransactionType == "Refund");

                var order = transaction.Order;

                if (order != null)
                {
                    order.Status = "Refunded";

                    var tracking = new OrderTrackingHistory()
                    {
                        TrackingID = Guid.NewGuid(),
                        TrackingStage = "Cancelled and Refunded",
                        Timestamp = DateTime.Now,
                        UpdatedBy = "Admin",
                        OrderID = order.OrderID,
                    };

                    order.TrackingHistory.Add(tracking);

                    transaction.Status = "refund " + webhookEvent.Data.Status;

                    db.Entry(order).State = EntityState.Modified;
                    db.Entry(transaction).State = EntityState.Modified;

                    await db.SaveChangesAsync();
                }

            }

            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }
    }
}
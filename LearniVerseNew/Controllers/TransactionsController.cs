using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Web;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels.Store_Models;

namespace LearniVerseNew.Controllers
{
    public class TransactionsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        public ActionResult Index(string sortOrder, string searchString)
        {
            // Set the sorting parameters for various columns
            ViewBag.AmountSortParm = String.IsNullOrEmpty(sortOrder) ? "amount_desc" : "";
            ViewBag.StatusSortParm = sortOrder == "status_asc" ? "status_desc" : "status_asc";
            ViewBag.DateSortParm = sortOrder == "date_asc" ? "date_desc" : "date_asc";
            ViewBag.TypeSortParm = sortOrder == "type_asc" ? "type_desc" : "type_asc"; // New sort for type

            // Fetch the transactions
            var transactions = from t in db.Transactions.Include(t => t.Order)
                               select t;

            // Search functionality
            if (!String.IsNullOrEmpty(searchString))
            {
                transactions = transactions.Where(t => t.Order.StudentID.Contains(searchString) ||
                                                       t.PaystackReference.Contains(searchString));
            }

            // Sorting logic
            switch (sortOrder)
            {
                case "amount_desc":
                    transactions = transactions.OrderByDescending(t => t.Amount);
                    break;
                case "status_asc":
                    transactions = transactions.OrderBy(t => t.Status);
                    break;
                case "status_desc":
                    transactions = transactions.OrderByDescending(t => t.Status);
                    break;
                case "date_asc":
                    transactions = transactions.OrderBy(t => t.TransactionDate);
                    break;
                case "date_desc":
                    transactions = transactions.OrderByDescending(t => t.TransactionDate);
                    break;
                case "type_asc":
                    transactions = transactions.OrderBy(t => t.TransactionType); // Sort by type ascending
                    break;
                case "type_desc":
                    transactions = transactions.OrderByDescending(t => t.TransactionType); // Sort by type descending
                    break;
                default:
                    transactions = transactions.OrderBy(t => t.Amount);
                    break;
            }

            return View(transactions.ToList());
        }



        // GET: Transactions/Details/5
        public async Task<ActionResult> Details(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Transaction transaction = await db.Transactions.FindAsync(id);
            if (transaction == null)
            {
                return HttpNotFound();
            }
            return View(transaction);
        }

        // GET: Transactions/Create
        public ActionResult Create()
        {
            ViewBag.OrderID = new SelectList(db.Orders, "OrderID", "StudentID");
            return View();
        }

        // POST: Transactions/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Create([Bind(Include = "TransactionID,OrderID,Amount,Status,TransactionDate,PaystackReference")] Transaction transaction)
        {
            if (ModelState.IsValid)
            {
                transaction.TransactionID = Guid.NewGuid();
                db.Transactions.Add(transaction);
                await db.SaveChangesAsync();
                return RedirectToAction("Index");
            }

            ViewBag.OrderID = new SelectList(db.Orders, "OrderID", "StudentID", transaction.OrderID);
            return View(transaction);
        }

        // GET: Transactions/Edit/5
        public async Task<ActionResult> Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Transaction transaction = await db.Transactions.FindAsync(id);
            if (transaction == null)
            {
                return HttpNotFound();
            }
            ViewBag.OrderID = new SelectList(db.Orders, "OrderID", "StudentID", transaction.OrderID);
            return View(transaction);
        }

        // POST: Transactions/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Edit([Bind(Include = "TransactionID,OrderID,Amount,Status,TransactionDate,PaystackReference")] Transaction transaction)
        {
            if (ModelState.IsValid)
            {
                db.Entry(transaction).State = EntityState.Modified;
                await db.SaveChangesAsync();
                return RedirectToAction("Index");
            }
            ViewBag.OrderID = new SelectList(db.Orders, "OrderID", "StudentID", transaction.OrderID);
            return View(transaction);
        }

        // GET: Transactions/Delete/5
        public async Task<ActionResult> Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Transaction transaction = await db.Transactions.FindAsync(id);
            if (transaction == null)
            {
                return HttpNotFound();
            }
            return View(transaction);
        }

        // POST: Transactions/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> DeleteConfirmed(Guid id)
        {
            Transaction transaction = await db.Transactions.FindAsync(id);
            db.Transactions.Remove(transaction);
            await db.SaveChangesAsync();
            return RedirectToAction("Index");
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}

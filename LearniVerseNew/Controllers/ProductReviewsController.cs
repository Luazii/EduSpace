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
using Microsoft.AspNet.Identity;

namespace LearniVerseNew.Controllers
{
    public class ProductReviewsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();


        [HttpPost]
        public async Task<ActionResult> AddReview(Guid productId, string reviewText, int rating)
        {
            string id = User.Identity.GetUserId();
            var user = await db.Students.FindAsync(id);

            // Validate the review
            if (string.IsNullOrWhiteSpace(reviewText) || rating < 1 || rating > 5)
            {
                return Json(new { success = false, message = "Invalid review data." });
            }

            // Retrieve the product
            var product = await db.Products.FindAsync(productId);
            if (product == null)
            {
                return Json(new { success = false, message = "Product not found." });
            }

            // Add the new review
            var newReview = new ProductReview
            {
                ReviewID = Guid.NewGuid(),
                ProductID = productId,
                ReviewerName = user.StudentFirstName + " " + user.StudentLastName, // Assuming logged-in user's name
                ReviewText = reviewText,
                Rating = rating,
                UserID = id,
                ReviewDate = DateTime.Now
            };

            db.ProductReviews.Add(newReview);
            await db.SaveChangesAsync();

            // Return the review data instead of HTML
            return Json(new
            {
                success = true,
                reviewID = newReview.ReviewID,
                reviewerName = newReview.ReviewerName,
                rating = newReview.Rating,
                reviewText = newReview.ReviewText,
                reviewDate = newReview.ReviewDate.ToString("MM/dd/yyyy")
            });
        }

        [HttpPost]
        public async Task<ActionResult> DeleteReview(Guid reviewId)
        {
            string id = User.Identity.GetUserId();

            var user = await db.Students.FindAsync(id);

            string userName = user.StudentFirstName + " " + user.StudentLastName;
            // Find the review
            var review = await db.ProductReviews.FindAsync(reviewId);
            if (review == null)
            {
                return Json(new { success = false, message = "Review not found." });
            }

            // Check if the current user is the one who wrote the review
            if (review.ReviewerName != userName)
            {
                return Json(new { success = false, message = "You are not authorized to delete this review." });
            }

            // Remove the review
            db.ProductReviews.Remove(review);
            await db.SaveChangesAsync();

            return Json(new { success = true });
        }





        // GET: ProductReviews
        public async Task<ActionResult> Index()
        {
            var productReviews = db.ProductReviews.Include(p => p.Product);
            return View(await productReviews.ToListAsync());
        }

        // GET: ProductReviews/Details/5
        public async Task<ActionResult> Details(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            ProductReview productReview = await db.ProductReviews.FindAsync(id);
            if (productReview == null)
            {
                return HttpNotFound();
            }
            return View(productReview);
        }

        // GET: ProductReviews/Create
        public ActionResult Create()
        {
            ViewBag.ProductID = new SelectList(db.Products, "ProductID", "ProductName");
            return View();
        }

        // POST: ProductReviews/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Create([Bind(Include = "ReviewID,ReviewerName,ReviewText,Rating,ReviewDate,ProductID")] ProductReview productReview)
        {
            if (ModelState.IsValid)
            {
                productReview.ReviewID = Guid.NewGuid();
                db.ProductReviews.Add(productReview);
                await db.SaveChangesAsync();
                return RedirectToAction("Index");
            }

            ViewBag.ProductID = new SelectList(db.Products, "ProductID", "ProductName", productReview.ProductID);
            return View(productReview);
        }

        // GET: ProductReviews/Edit/5
        public async Task<ActionResult> Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            ProductReview productReview = await db.ProductReviews.FindAsync(id);
            if (productReview == null)
            {
                return HttpNotFound();
            }
            ViewBag.ProductID = new SelectList(db.Products, "ProductID", "ProductName", productReview.ProductID);
            return View(productReview);
        }

        // POST: ProductReviews/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Edit([Bind(Include = "ReviewID,ReviewerName,ReviewText,Rating,ReviewDate,ProductID")] ProductReview productReview)
        {
            if (ModelState.IsValid)
            {
                db.Entry(productReview).State = EntityState.Modified;
                await db.SaveChangesAsync();
                return RedirectToAction("Index");
            }
            ViewBag.ProductID = new SelectList(db.Products, "ProductID", "ProductName", productReview.ProductID);
            return View(productReview);
        }

        // GET: ProductReviews/Delete/5
        public async Task<ActionResult> Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            ProductReview productReview = await db.ProductReviews.FindAsync(id);
            if (productReview == null)
            {
                return HttpNotFound();
            }
            return View(productReview);
        }

        // POST: ProductReviews/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> DeleteConfirmed(Guid id)
        {
            ProductReview productReview = await db.ProductReviews.FindAsync(id);
            db.ProductReviews.Remove(productReview);
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

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
using LearniVerseNew.Models.ApplicationModels.ViewModels;
using LearniVerseNew.Models.Helpers;
using LearniVerseNew.Models.ApplicationModels;
using System.IdentityModel;
using Microsoft.AspNet.Identity;
using System.Data.Entity.Validation;
using System.Configuration;

namespace LearniVerseNew.Controllers
{
    public class ProductsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();
        private BlobHelper blobHelper = new BlobHelper();
        private PaystackHelper paystackHelper = new PaystackHelper();
        private PdfHelper pdfHelper = new PdfHelper();
        private EmailHelper emailHelper = new EmailHelper();

        [Authorize(Roles = "User")]
        public async Task<ActionResult> StoreFront(string searchTerm, Guid? categoryId)
        {
            // Fetch all products and include categories
            var products = db.Products.Include(p => p.Category).AsQueryable();

            // Filter by search term if provided
            if (!string.IsNullOrEmpty(searchTerm))
            {
                products = products.Where(p => p.ProductName.Contains(searchTerm));
            }

            // Filter by category if provided
            if (categoryId.HasValue && categoryId.Value != Guid.Empty)
            {
                products = products.Where(p => p.CategoryID == categoryId);
            }

            // Load categories for the filter dropdown
            ViewBag.Categories = new SelectList(db.Categories, "CategoryID", "CategoryName");


            // Suggested product
            var productList = await products.OrderBy(p => p.ProductID).ToListAsync();

            if (productList.Any())
            {
                // Check if the session already has a suggested product
                if (Session["SuggestedProduct"] == null)
                {
                    if (productList.Any())
                    {
                        Random random = new Random();
                        int randomIndex = random.Next(0, productList.Count);

                        // Select a random product from the ordered list
                        var suggestedProduct = productList.Skip(randomIndex).FirstOrDefault();

                        // Store the suggested product in the session
                        Session["SuggestedProduct"] = suggestedProduct;
                    }
                }
                else
                {
                    // If a suggested product is already in the session, retrieve it
                    var suggestedProduct = (Product)Session["SuggestedProduct"];
                    ViewBag.SuggestedProduct = suggestedProduct;
                }

                // Pass the suggested product to the ViewBag for rendering in the view
                if (Session["SuggestedProduct"] != null)
                {
                    ViewBag.SuggestedProduct = (Product)Session["SuggestedProduct"];
                }
            }

            return View(products.ToList());
        }

        public ActionResult ViewProduct(Guid Id)
        {
            var product = db.Products.Find(Id);

            var currentUserId = User.Identity.GetUserId();  // Get the User ID

            ViewBag.CurrentUserId = currentUserId;

            return View(product);
        }

        private List<CartItem> GetCart()
        {
            var cart = Session["Cart"] as List<CartItem>;
            if (cart == null)
            {
                cart = new List<CartItem>();
                Session["Cart"] = cart;
            }
            return cart;
        }

        public ActionResult Cart()
        {
            var cart = GetCart();
            return View(cart); // Pass the cart to the view
        }


        [HttpPost]
        public async Task<JsonResult> AddToCart(Guid productId, int quantity = 1)
        {
            // Retrieve the cart from session
            var cart = GetCart();

            // Find the product in the database (use await for async database operations)
            var product = await db.Products.FindAsync(productId); // Assuming 'db' is your database context
            if (product == null)
            {
                return Json(new { success = false, message = "Product not found." });
            }

            if (quantity > product.QuantityInStock)
            {
                return Json(new { success = false, message = $"Only {product.QuantityInStock} items left in stock for {product.ProductName}." });
            }

            // Check if the product is already in the cart
            var existingCartItem = cart.FirstOrDefault(p => p.ProductID == productId);
            if (existingCartItem != null)
            {
                // Calculate the total quantity after adding
                var totalQuantity = existingCartItem.Quantity + quantity;

                // Prevent over-adding
                if (totalQuantity > product.QuantityInStock)
                {
                    return Json(new { success = false, message = $"Only {product.QuantityInStock} items left in stock for {product.ProductName}." });
                }

                // If the quantity is valid, increase the existing cart item's quantity
                existingCartItem.Quantity = totalQuantity;
            }
            else
            {
               
                // Otherwise, add the new product to the cart
                cart.Add(new CartItem
                {
                    ProductID = productId,
                    ProductName = product.ProductName,
                    Price = product.Price,
                    Quantity = quantity
                });
            }

            // Save the cart back into session
            Session["Cart"] = cart;

            // Return a JSON response with success status and updated cart count
            return Json(new { success = true, cartCount = cart.Count });
        }


        [HttpPost]
        public ActionResult RemoveFromCart(Guid id)
        {
            // Retrieve the cart from session
            var cart = GetCart();

            // Find the product in the cart
            var itemToRemove = cart.FirstOrDefault(p => p.ProductID == id);
            if (itemToRemove != null)
            {
                cart.Remove(itemToRemove);
            }

            // Save the updated cart to session
            Session["Cart"] = cart;

            return RedirectToAction("Cart");
        }

        public ActionResult ShippingAddress()
        {
            return View(new Order()); // Display the shipping form
        }

        // POST: Handle form submission
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ConfirmShipping(Order order)
        {
            string Id = User.Identity.GetUserId();
            

            if (ModelState.IsValid)
            {
                return View("ShippingAddress", order); // Return to form if validation fails
            }

            order.OrderID = Guid.NewGuid();
            order.DateOrdered = DateTime.Now;
            order.StudentID = Id;
            order.OrderItems = new List<OrderItem>();
            order.TrackingHistory = new List<OrderTrackingHistory>();

            // Store the order details in TempData or Session for later use
            TempData["Order"] = order;

            // Redirect to the payment step
            return RedirectToAction("Checkout");
        }

        public ActionResult Checkout(string email)
        {
            email = User.Identity.GetUserName();

            decimal cartTotal = 0m;

            var cart = GetCart();

            foreach(var item in cart)
            {
                cartTotal += item.Price * item.Quantity;
            }

            // Ensure the cart has a valid total amount
            if (cartTotal <= 0)
            {
                return View("Error");
            }

            //var callbackUrl = Url.Action("PaymentCallback", "Checkout", null, Request.Url.Scheme);

            var baseUrl = ConfigurationManager.AppSettings["AppBaseUrl"];

            var callbackUrl = $"{baseUrl}/Products/PaymentCallback";

            var order = TempData["Order"] as Order;

            order.TotalPrice = cartTotal;

            foreach(var item in cart)
            {
               
                var OrderItem = new OrderItem()
                {
                    OrderID = order.OrderID,
                    OrderItemID = Guid.NewGuid(),
                    ProductID = item.ProductID, // Use the ProductID from the database
                    Order = order,
                    Quantity = item.Quantity
                };

                order.OrderItems.Add(OrderItem);
            }

            // Initialize the transaction with Paystack
            var response = paystackHelper.InitializeTransactionForCheckout(email, cartTotal, callbackUrl);

            if (response.Status)
            {
                TempData["FinalOrder"] = order;
                return Redirect(response.Data.AuthorizationUrl);
            }

            // Handle any error that occurs during initialization
            return View("Error");
        }


        public async Task<ActionResult> PaymentCallback(string reference)
        {
            // Verify the Paystack transaction
            var response = paystackHelper.VerifyTransaction(reference);

            if (response.Status && response.Data.Status == "success")
            {
                // Retrieve the order from TempData
                var order = TempData["FinalOrder"] as Order;
                order.Status = "Received";

                foreach(var item in order.OrderItems)
                {
                   var product = db.Products.Find(item.ProductID);

                    product.QuantityInStock -= item.Quantity;
                }

                if (order == null)
                {
                    return View("Error");
                }

                var transaction = new Transaction()
                {
                    TransactionID = Guid.NewGuid(),
                    TransactionDate = DateTime.Now,
                    OrderID = order.OrderID,
                    Amount = order.TotalPrice,
                    TransactionType = "Purchase",
                    PaystackReference = response.Data.Reference,
                    Status = response.Data.Status,
                };

                var tracking = new OrderTrackingHistory()
                {
                    TrackingID = Guid.NewGuid(),
                    OrderID = order.OrderID,
                    Timestamp = DateTime.Now,
                    UpdatedBy = "Admin",
                    TrackingStage = "Received"
                };
                
                order.TrackingHistory.Add(tracking);

                // Save the order and order items to the database asynchronously
                using (var db = new ApplicationDbContext())
                {
                    foreach (var item in order.OrderItems)
                    {
                        var product = db.Products.Find(item.ProductID);

                        product.QuantityInStock -= item.Quantity;

                        if (product.QuantityInStock <= product.LowStockThreshold)
                        {
                            // Create a new notification
                            var notification = new AdminNotification
                            {
                                NotificationID = Guid.NewGuid(),
                                Message = $"Low stock alert for {product.ProductName}. Only {product.QuantityInStock} left in stock.",
                                CreatedAt = DateTime.Now,
                                IsRead = false,
                                ProductID = product.ProductID
                            };

                            db.AdminNotifications.Add(notification);
                        }


                    }

                    db.Transactions.Add(transaction);
                    db.Orders.Add(order);
                    try
                    {
                        await db.SaveChangesAsync();
                    }
                    catch (DbEntityValidationException ex)
                    {
                        foreach (var entityValidationErrors in ex.EntityValidationErrors)
                        {
                            foreach (var validationError in entityValidationErrors.ValidationErrors)
                            {
                                System.Diagnostics.Debug.WriteLine("Property: " + validationError.PropertyName + " Error: " + validationError.ErrorMessage);
                            }
                        }
                        throw; // Rethrow the exception after logging it for debugging
                    }
                    // Save changes asynchronously

                    ClearCart(); // Clear the cart after processing
                }

                var PdfOrder = db.Orders.Find(order.OrderID);
                // Generate the PDF invoice asynchronously
                byte[] pdfInvoice = pdfHelper.GeneratePdfInvoice(PdfOrder); // Assuming this is a synchronous method

                // Send the invoice email asynchronously
                await emailHelper.SendInvoiceAsync(PdfOrder.Student.StudentEmail, pdfInvoice, $"Invoice_{order.OrderID}.pdf");

                // Redirect to a success page
                TempData["OrderID"] = order.OrderID;
                return RedirectToAction("PaymentSuccess");
            }

            // If payment failed, return to an error page
            return View("Error");
        }



        public ActionResult PaymentSuccess(Order order)
        {
            var orderId = TempData["OrderID"];
            order = db.Orders.Find(orderId);
            return View(order);
        }

        private void ClearCart()
        {
            if (Session["Cart"] != null)
            {
                Session.Remove("Cart"); // Removes the cart from the session
            }
        }

        // GET: Products
        [Authorize(Roles = "Admin")]
        public ActionResult Index(string productName, Guid? categoryId)
        {
            // Fetch all products
            var products = db.Products.Include(p => p.Category).AsQueryable();

            // Filter by product name if provided
            if (!string.IsNullOrEmpty(productName))
            {
                products = products.Where(p => p.ProductName.Contains(productName));
            }

            // Filter by category if provided
            if (categoryId.HasValue)
            {
                products = products.Where(p => p.CategoryID == categoryId);
            }

            // Pass the filtered products to the view
            ViewBag.Categories = new SelectList(db.Categories, "CategoryID", "CategoryName", categoryId); // Pre-select the chosen category
            ViewBag.ProductName = productName; // To retain the search value in the input field

            return View(products.ToList());
        }

        // GET: Products/Details/5
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> Details(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }

            Product product = await db.Products.FindAsync(id);
            if (product == null)
            {
                return HttpNotFound();
            }

            // Retrieve the product image from Blob Storage
            try
            {
                byte[] photoBytes = await blobHelper.RetriveProductPhotoAsync(product.ImageName);
                if (photoBytes != null)
                {
                    ViewBag.PhotoData = Convert.ToBase64String(photoBytes);
                }
                else
                {
                    ViewBag.DefaultPhotoPath = "/images/default.jpg";
                }
            }
            catch (RequestFailedException)
            {
                ViewBag.DefaultPhotoPath = "/images/default.jpg";
            }

            return View(product);
        }

        // GET: Products/Create
        [Authorize(Roles = "Admin")]
        public ActionResult AddProduct()
        {
            ViewBag.CategoryID = new SelectList(db.Categories, "CategoryID", "CategoryName");
            return View();
        }

        // POST: Products/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> AddProduct(ProductCreateViewModel model, HttpPostedFileBase ImageFile)
        {
            if (ModelState.IsValid)
            {
                if (ImageFile != null && ImageFile.ContentLength > 0)
                {
                    // Save image to blob storage and get the URI
                    (bool success, string name, string url) = blobHelper.UploadProductBlob(ImageFile.FileName, ImageFile.InputStream);

                    if (success)
                    {
                        var product = new Product
                        {
                            ProductID = Guid.NewGuid(),
                            ProductName = model.ProductName,
                            Price = model.Price,
                            Description = model.Description,
                            QuantityInStock = model.QuantityInStock,
                            LowStockThreshold = 2,
                            ImageName = name,
                            ImageUrl = url, // Save the blob URL
                            CategoryID = model.CategoryID // Assign selected category
                        };

                        db.Products.Add(product);
                        await db.SaveChangesAsync();

                        return RedirectToAction("Index");
                    }
                    else
                    {
                        ModelState.AddModelError("", "Image upload failed.");
                    }
                }
                else
                {
                    ModelState.AddModelError("", "Please select an image file.");
                }
            }

            // Reload categories in case of model validation errors
            ViewBag.CategoryID = new SelectList(db.Categories, "CategoryID", "CategoryName", model.CategoryID);
            return View(model);
        }

        // GET: Products/Edit/5
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Product product = await db.Products.FindAsync(id);
            if (product == null)
            {
                return HttpNotFound();
            }

            try
            {
                byte[] photoBytes = await blobHelper.RetriveProductPhotoAsync(product.ImageName);
                if (photoBytes != null)
                {
                    ViewBag.PhotoData = Convert.ToBase64String(photoBytes);
                }
                else
                {

                    ViewBag.DefaultPhotoPath = "/images/default.jpg";
                }
            }
            catch (RequestFailedException ex)
            {
                ViewBag.DefaultPhotoPath = "/images/default.jpg";
            }

            return View(product);
        }

        // POST: Products/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> Edit(Guid id, Product product, HttpPostedFileBase ImageFile)
        {
            if (ModelState.IsValid)
            {
                // Fetch the existing product from the database
                var existingProduct = await db.Products.FindAsync(id);
                if (existingProduct == null)
                {
                    return HttpNotFound();
                }

                // Store the old image name before potential replacement
                string oldImageName = existingProduct.ImageName;

                // Update product details (non-image fields)
                existingProduct.ProductName = product.ProductName;
                existingProduct.Price = product.Price;
                existingProduct.Description = product.Description;
                existingProduct.QuantityInStock = product.QuantityInStock;
               // existingProduct.CategoryID = product.CategoryID;

                // Handle image file if uploaded
                if (ImageFile != null && ImageFile.ContentLength > 0)
                {
                    // Delete the old image from blob storage
                   blobHelper.DeleteProductBlob(oldImageName);
                   
                    // Upload the new image
                    using (var stream = ImageFile.InputStream)
                    {
                        (bool success, string newImageName, string newImageUrl) = blobHelper.UploadProductBlob(ImageFile.FileName, stream);
                        if (!success)
                        {
                            ModelState.AddModelError("", "Error uploading new image.");
                            return View(product);
                        }

                        // Update the product's image name and URL
                        existingProduct.ImageName = newImageName;
                        existingProduct.ImageUrl = newImageUrl;
                    }
                }

                // Mark the product as modified and save changes
                db.Entry(existingProduct).State = EntityState.Modified;
                await db.SaveChangesAsync();

                return RedirectToAction("Index");
            }

            // Reload the model in case of validation errors
            return View(product);
        }



        // GET: Products/Delete/5
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Product product = await db.Products.FindAsync(id);
            if (product == null)
            {
                return HttpNotFound();
            }
            return View(product);
        }

        // POST: Products/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> DeleteConfirmed(Guid id)
        {
            Product product = await db.Products.FindAsync(id);
            blobHelper.DeleteProductBlob(product.ImageName);
            db.Products.Remove(product);
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

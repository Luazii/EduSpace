using Azure;
using LearniVerseNew.Models.ApplicationModels.ViewModels;
using LearniVerseNew.Models.ApplicationModels;
using LearniVerseNew.Models.Helpers;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using LearniVerseNew.Models;

namespace LearniVerseNew.Controllers
{
    public class ResourcesController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();
        private BlobHelper blobHelper = new BlobHelper();



        [Authorize(Roles = "Teacher")]
        public ActionResult Upload()
        {
            string email = User.Identity.Name;
            var teacher = db.Teachers.FirstOrDefault(t => t.TeacherEmail == email);

            var courses = db.Courses
                .Where(c => c.TeacherID == teacher.TeacherID)
                .ToList();
            ViewBag.Courses = new SelectList(courses, "CourseID", "CourseName");
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Teacher")]
        public ActionResult Upload(UploadViewModel model)
        {
            if (ModelState.IsValid)
            {
                if (model.File != null && model.File.ContentLength > 0)
                {

                    string fileName = Path.GetFileName(model.File.FileName);


                    var uploadResult = blobHelper.UploadBlob(model.FileName, model.File.InputStream);


                    if (uploadResult.Success)
                    {

                        Resource resource = new Resource
                        {
                            ResourceID = Guid.NewGuid(),
                            FileName = model.FileName,
                            CourseID = model.CourseID,
                            FileDescription = model.Description,
                            BlobURL = uploadResult.Uri
                        };


                        db.Resources.Add(resource);
                        db.SaveChanges();

                        return RedirectToAction("Index", "Home");
                    }


                    ModelState.AddModelError("", "Error uploading file");

                }
                else
                {
                    ModelState.AddModelError("", "Please select a file to upload.");
                }

            }
            var courses = db.Courses.ToList();
            ViewBag.Courses = new SelectList(courses, "CourseID", "CourseName");
            return View(model);
        }

        public ActionResult GetQrCode(string blobName)
        {
            QRHelper qrHelper = new QRHelper();
            string qrCodeBase64 = qrHelper.GenerateQRCode(blobName);

            return Json(new { QrCodeBase64 = qrCodeBase64 }, JsonRequestBehavior.AllowGet);
        }


        [HttpPost]
        public ActionResult DownloadBlob(string fileName)
        {
            try
            {
                var blobHelper = new BlobHelper(); // Initialize your BlobHelper
                var fileStream = blobHelper.DownloadBlob(fileName); // Call your BlobHelper method to download the blob content

                if (fileStream == null)
                {
                    throw new FileNotFoundException("Blob not found.");
                }

                byte[] fileBytes;
                using (var memoryStream = new MemoryStream())
                {
                    fileStream.CopyTo(memoryStream);
                    fileBytes = memoryStream.ToArray();
                }

                return File(fileBytes, "application/pdf", $"{fileName}.pdf");
            }
            catch (RequestFailedException ex)
            {
                throw new Exception($"Error downloading blob: {ex.Message}");
            }
        }
    }
}
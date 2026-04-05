using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Data.Entity.Migrations;
using System.IdentityModel;
using System.IO;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels;
using LearniVerseNew.Models.ApplicationModels.ViewModels;
using LearniVerseNew.Models.Helpers;
using Newtonsoft.Json;

namespace LearniVerseNew.Controllers
{
    public class EnrollmentsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        [Authorize(Roles = "User")]
        public ActionResult MyEnrollments()
        {
            string studentId = User.Identity.Name;

            var enrollments = db.Enrollments
                                .Where(e => e.Student.StudentEmail == studentId)
                                .ToList();

            return View(enrollments);
        }


        [Authorize(Roles = "User")]
        public ActionResult SelectFaculty(string studentId)
        {
            studentId = User.Identity.Name;


            var student = db.Students.FirstOrDefault(s => s.StudentEmail == studentId);

            if (student == null)
            {
                return HttpNotFound();
            }


            var availableFaculties = db.Faculties.ToList();

            var viewModel = new EnrolViewModel
            {
                StudentID = student.StudentID,
                StudentFirstName = student.StudentFirstName,
                StudentLastName = student.StudentLastName,
                AvailableFaculties = availableFaculties
            };

            
            return View(viewModel);
        }

        [Authorize(Roles = "User")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult SelectFaculty(EnrolViewModel viewModel)
        {

            if (ModelState.IsValid)
            {
                var selectedFaculty = db.Faculties.FirstOrDefault(f => f.FacultyID == viewModel.SelectedFaculty);

                if (selectedFaculty != null)
                {

                    var Qualifications = db.Qualifications.Where(q => q.FacultyID == selectedFaculty.FacultyID).ToList();

                    viewModel.AvailableQualifications = Qualifications;

                    TempData["SelectedFaculty"] = viewModel.SelectedFaculty;
                    return View("SelectQualification", viewModel);
                }
                else
                {

                    ModelState.AddModelError(string.Empty, "Invalid faculty selection.");
                    return View(viewModel);
                }
            }

            return View(viewModel);
        }


        [Authorize(Roles = "User")]
        public ActionResult SelectQualification()
        {
            var selectedFacultyId = TempData["SelectedFaculty"].ToString();

            if (selectedFacultyId == null)
            {
                return RedirectToAction("SelectFaculty");
            }


            var availableQualifications = db.Qualifications.Where(q => q.FacultyID == selectedFacultyId).ToList();

            if (availableQualifications.Count == 0)
            {

                ModelState.AddModelError(string.Empty, "No qualifications found for the selected faculty.");
                return View("SelectFaculty");
            }


            return View(availableQualifications);
        }

        [Authorize(Roles = "User")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult SelectQualification(EnrolViewModel viewModel)
        {
            if (ModelState.IsValid)
            {

                TempData["SelectedQualificationID"] = viewModel.SelectedQualificationID;


                return RedirectToAction("SelectCourses");
            }


            return View(viewModel);
        }


        [Authorize(Roles = "User")]
        public ActionResult SelectCourses()
        {
            string QualificationID = TempData["SelectedQualificationID"].ToString();

            var availableCourses = db.Courses.Where(c => c.QualificationID == QualificationID).ToList();

            var viewModel = new EnrolViewModel
            {
                AvailableCourses = availableCourses
            };

            TempData["QualificationID"] = QualificationID;

            return View(viewModel);
        }

        [Authorize(Roles = "User")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult SelectCourses(EnrolViewModel viewModel)
        {
            if (ModelState.IsValid)
            {
                var selectedCourses = db.Courses.Where(c => viewModel.SelectedCourseIDs.Contains(c.CourseID)).ToList();

                TempData["SelectedCourseIDs"] = viewModel.SelectedCourseIDs;
                TempData["SelectedCourses"] = selectedCourses;

                return View("UploadNSC");
            }


            return View(viewModel);
        }

       
        public ActionResult UploadNSC()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult UploadNSC(string subjectsJson, HttpPostedFileBase NSCDocument)
        {
            if (NSCDocument != null && NSCDocument.ContentLength > 0)
            {
                // Retrieve the original filename with extension
                string originalFileName = Path.GetFileName(NSCDocument.FileName);

                // Store the file bytes in memory
                byte[] fileBytes;
                using (var memoryStream = new MemoryStream())
                {
                    NSCDocument.InputStream.CopyTo(memoryStream);
                    fileBytes = memoryStream.ToArray();
                }

                // Store the original filename and file bytes in TempData to pass to the callback action
                TempData["NSCDocumentFileName"] = originalFileName;
                TempData["NSCDocumentBytes"] = fileBytes;
            }

            // Handle NSC subjects
            if (!string.IsNullOrEmpty(subjectsJson))
            {
                var subjects = JsonConvert.DeserializeObject<List<NSCSubject>>(subjectsJson);
                TempData["Subjects"] = subjects;
            }

            var selectedCourses = TempData["SelectedCourses"];

            return View("Confirmation", selectedCourses);
        }

        [Authorize(Roles = "User")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Confirmation()
        {
            string studentEmail = User.Identity.Name;
            var paystackService = new PaystackHelper();
            var initializeResponse = paystackService.InitializeTransaction(studentEmail, Convert.ToInt32(1500 * 100), "https://empress-learniverse.azurewebsites.net/Enrollments/ApplicationCallBack"); //

            if (!initializeResponse.Status)
            {
                ViewBag.ErrorMessage = initializeResponse.Message;
                return View("Error");
            }

           
            return Redirect(initializeResponse.Data.AuthorizationUrl);

        }


        [Authorize(Roles = "User")]
        public ActionResult EnrollmentPending()
        {
            return View();
        }

        [Authorize(Roles = "Admin")]
        public ActionResult PendingApplications()
        {
            var pendingEnrollments = db.Enrollments.Where(e => !e.IsApproved && e.IsRejected == false).ToList();
            return View(pendingEnrollments);
        }

        [Authorize(Roles = "Admin")]
        public ActionResult RejectedApplications()
        {
            var rejectedEnrollments = db.Enrollments.Where(e => !e.IsApproved && e.IsRejected == true).ToList();
            return View(rejectedEnrollments);
        }

        [Authorize(Roles = "Admin")]
        public ActionResult ReviewEnrollment(Guid id)
        {
            var enrollment = db.Enrollments.Find(id);
            var student = db.Students.FirstOrDefault(s => s.StudentID == enrollment.StudentID);
            var nsc = db.NSCSubmissions.Where(s => s.Student.StudentID == student.StudentID).First();
            var subjects = db.NSCSubjects.Where(n => n.NSCSubmissionID == nsc.NSCSubmissionID).ToList();
            ReviewApplicationViewModel viewmodel = new ReviewApplicationViewModel();

                viewmodel.Student = student;
                viewmodel.Enrollment = enrollment;
                viewmodel.NSC = nsc;
                viewmodel.Subjects = subjects; 
                viewmodel.average = viewmodel.CalcAverage(subjects);

            return View(viewmodel);
        }


        [Authorize(Roles = "Admin")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ApproveEnrollment(Guid id)
        {
            EmailHelper mailer = new EmailHelper();
           
            var enrollment = db.Enrollments.Find(id);
            if (enrollment != null)
            {
                var student = db.Students.FirstOrDefault(s => s.StudentID == enrollment.StudentID);
                enrollment.IsApproved = true;
                enrollment.IsRejected = false;
                db.SaveChanges();
                mailer.SendEmailApproved(student.StudentEmail, $"{student.StudentFirstName} {student.StudentLastName}");
                ViewData["SuccessMessage"] = $"{enrollment.Student.StudentFirstName} {enrollment.Student.StudentLastName}'s Enrollment application has been approved.";
            }
            return RedirectToAction("PendingApplications");
        }


        [Authorize(Roles = "Admin")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult RejectEnrollment(Guid id)
        {
            EmailHelper mailer = new EmailHelper();

            var enrollment = db.Enrollments.Find(id);
            if (enrollment != null)
            {
                var student = db.Students.FirstOrDefault(s => s.StudentID == enrollment.StudentID);
                enrollment.IsRejected = true;
                db.SaveChanges();
                mailer.SendEmailRejected(student.StudentEmail, $"{student.StudentFirstName} {student.StudentLastName}");
                ViewData["SuccessMessage"] = $"{enrollment.Student.StudentFirstName} {enrollment.Student.StudentLastName}'s Enrollment application has been rejected.";
            }
            return RedirectToAction("PendingApplications");
        }


        [AllowAnonymous] 
        public ActionResult DownloadNSC(string studentId,string fileName)
        {
            try
            {
                var blobHelper = new BlobHelper(); // Initialize your BlobHelper
                var fileStream = blobHelper.DownloadBlobNSC(studentId,fileName); // Call your BlobHelper method to download the blob content
                string uniqueFilename = studentId + "_" + fileName;
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

                return File(fileBytes, "application/pdf", $"{uniqueFilename}");
            }
            catch (RequestFailedException ex)
            {
                throw new Exception($"Error downloading blob: {ex.Message}");
            }
        }

        [Authorize(Roles = "User")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Pay(Guid enrollmentId)
        {
            string email = User.Identity.Name;
            var enrollment = db.Enrollments.Find(enrollmentId);
            if (enrollment == null)
            {
                return HttpNotFound();
            }

            decimal totalCost = enrollment.Courses.Sum(c => c.Price);

            var paystackService = new PaystackHelper();
            var initializeResponse = paystackService.InitializeTransaction(email, Convert.ToInt32(totalCost * 100), "https://empress-learniverse.azurewebsites.net/Enrollments/PaystackCallback"); // add callback url

            if (!initializeResponse.Status)
            {
                ViewBag.ErrorMessage = initializeResponse.Message;
                return View("Error");
            }

            TempData["enrollmentId"] = enrollment.EnrollmentID;

            return Redirect(initializeResponse.Data.AuthorizationUrl);
        }

        [Authorize(Roles = "User")]
        public ActionResult EnrollmentDetails(Student student)
        {
            string email = User.Identity.Name;

            student = db.Students.Include(s => s.Enrollments.Select(e => e.Courses))
                                  .Include(f => f.Faculty)
                                  .Include(q => q.Qualification)
                                  .FirstOrDefault(s => s.StudentEmail == email);

            return View(student);
        }


        public ActionResult ApplicationCallBack(string reference)
        {
            EmailHelper emailer = new EmailHelper();
            // Retrieve transaction reference from the request
            //var reference = Request.Form["Params[reference]"];

            // Use Paystack API to verify the transaction
            var paystackService = new PaystackHelper(); // Assuming PaystackHelper is your service class
            var verifyResponse = paystackService.VerifyTransaction(reference);

            // Check if the payment was successful
            if (verifyResponse.Status)
            {
                var studentEmail = verifyResponse.Data.Customer.Email;

                // Find the student in the database
                var student = db.Students.FirstOrDefault(s => s.StudentEmail == studentEmail);

                if (student != null)
                {
                    // Retrieve selected faculty, qualification, and course IDs from TempData
                    string selectedFaculty = TempData["SelectedFaculty"].ToString();
                    string selectedQualification = TempData["QualificationID"].ToString();
                    var selectedCourseIds = TempData["SelectedCourseIDs"] as IEnumerable<string>;
                    var nscDocumentFileName = TempData["NSCDocumentFileName"].ToString();
                    var nscDocumentBytes = TempData["NSCDocumentBytes"] as byte[];
                    var subjects = TempData["Subjects"] as List<NSCSubject>;


                    // Ensure all required data is available
                    if (selectedCourseIds == null)
                    {
                        return RedirectToAction("SelectFaculty");
                    }

                    // Upload NSC document to Blob Storage
                    var blobHelper = new BlobHelper();
                    var uploadResult = blobHelper.UploadNSCBlob(student.StudentID,nscDocumentFileName, new MemoryStream(nscDocumentBytes));

                    if (!uploadResult.Success)
                    {
                        ViewBag.ErrorMessage = uploadResult.Uri; // Handle the error accordingly
                        return View("Error");
                    }

                    var nscSubmission = new NSCSubmission
                    {
                        NSCSubmissionID = Guid.NewGuid(),
                        Student = student,
                        DocumentName = nscDocumentFileName,
                        DocumentURL = uploadResult.Uri, // Store the Blob URI in the database
                        SubmissionDate = DateTime.Now,
                        Subjects = new List<NSCSubject>()
                        // Other NSCSubmission properties
                    };

                    foreach (var subject in subjects)
                    {
                        subject.NSCSubmission = nscSubmission;
                        nscSubmission.Subjects.Add(subject);
                    }

                    // Convert course IDs to a list
                    var courseIdsList = selectedCourseIds.ToList();

                    var enrollment = new Enrollment
                    {
                        EnrollmentID = Guid.NewGuid(),
                        StudentID = student.StudentID,
                        EnrollmentDate = DateTime.Now,
                        IsApproved = false,
                        HasPaid = false,
                        Courses = new List<Course>()
                    };

                    // Create a new Enrollment for each selected course
                    foreach (var courseId in courseIdsList)
                    {
                        var course = db.Courses
                                    .Include(c => c.Teacher)
                                    .Include(q => q.Qualification)
                                    .FirstOrDefault(c => c.CourseID == courseId);

                        if (course != null)
                        {

                            enrollment.Courses.Add(course);
                            
                        }
                    }

                    db.NSCSubmissions.Add(nscSubmission);

                    db.Enrollments.Add(enrollment);
                    // Update student's faculty and qualification
                    student.FacultyID = selectedFaculty;
                    student.QualificationID = selectedQualification;

                    // Save changes to the database
                    db.SaveChanges();

                    // Send email notification
                    emailer.SendEmailApprovalPending(student.StudentEmail, $"{student.StudentFirstName} {student.StudentLastName}");

                    // Redirect to EnrollmentPending
                    return RedirectToAction("EnrollmentPending");
                }
                else
                {

                    ViewBag.ErrorMessage = "Student not found.";
                    return View("Error");
                }


            }
            else
            {
                // Payment verification failed, handle accordingly
                ViewBag.ErrorMessage = verifyResponse.Message;
                return View("Error");
            }
        }


        public ActionResult PaystackCallback(string reference)
        {
            PdfHelper pdfHelper = new PdfHelper();
            var paystackService = new PaystackHelper();
            var verifyResponse = paystackService.VerifyTransaction(reference);
            Guid Id;

            string email = User.Identity.Name;

            Student student = db.Students.FirstOrDefault(s => s.StudentEmail == email);

            if (verifyResponse.Status)
            {
                if (TempData["enrollmentId"] != null && Guid.TryParse(TempData["enrollmentId"].ToString(), out Id))
                {


                    var enrollment = db.Enrollments.Find(Id);
                    if (enrollment != null)
                    {
                        decimal totalCost = verifyResponse.Data.Amount;
                        var paymentReference = Payment.GeneratePaymentReference(student.StudentID);

                        enrollment.HasPaid = true;

                        var payment = new Payment
                        {
                            StudentID = student.StudentID,
                            EnrollmentID = enrollment.EnrollmentID,
                            AmountPaid = (totalCost/100),
                            PaymentReference = paymentReference,
                            PaymentDate = DateTime.Now
                        };

                        db.Payments.Add(payment);
                        db.SaveChanges();

                        List<string> courseIds = enrollment.Courses.Select(c => c.CourseID).ToList();

                        // Generate and email invoice
                        //PdfHelper.GenerateAndEmailInvoice(student, courseIds, (totalCost/100), paymentReference);

                    }
                    else
                    {
                        return HttpNotFound();
                    }
                }
                else
                {
                   
                    return HttpNotFound();
                }
            }
            else
            {
                // Payment verification failed, handle accordingly
                ViewBag.ErrorMessage = verifyResponse.Message;
                return View("Error");
            }

            return RedirectToAction("PaymentSuccessful", "Payments"); //create payment received
        }


        // GET: Enrollments
        public ActionResult Index()
        {
            var enrollments = db.Enrollments.Include(e => e.Student);
            return View(enrollments.ToList());
        }

        // GET: Enrollments/Details/5
        public ActionResult Details(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Enrollment enrollment = db.Enrollments.Find(id);
            if (enrollment == null)
            {
                return HttpNotFound();
            }
            return View(enrollment);
        }

        // GET: Enrollments/Create
        public ActionResult Create()
        {
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName");
            return View();
        }

        // POST: Enrollments/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create([Bind(Include = "EnrollmentID,StudentID,IsApproved,HasPaid,EnrollmentDate")] Enrollment enrollment)
        {
            if (ModelState.IsValid)
            {
                enrollment.EnrollmentID = Guid.NewGuid();
                db.Enrollments.Add(enrollment);
                db.SaveChanges();
                return RedirectToAction("Index");
            }

            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName", enrollment.StudentID);
            return View(enrollment);
        }

        // GET: Enrollments/Edit/5
        public ActionResult Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Enrollment enrollment = db.Enrollments.Find(id);
            if (enrollment == null)
            {
                return HttpNotFound();
            }
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName", enrollment.StudentID);
            return View(enrollment);
        }

        // POST: Enrollments/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit([Bind(Include = "EnrollmentID,StudentID,IsApproved,HasPaid,EnrollmentDate")] Enrollment enrollment)
        {
            if (ModelState.IsValid)
            {
                db.Entry(enrollment).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName", enrollment.StudentID);
            return View(enrollment);
        }

        // GET: Enrollments/Delete/5
        public ActionResult Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Enrollment enrollment = db.Enrollments.Find(id);
            if (enrollment == null)
            {
                return HttpNotFound();
            }
            return View(enrollment);
        }

        // POST: Enrollments/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(Guid id)
        {
            Enrollment enrollment = db.Enrollments.Find(id);
            db.Enrollments.Remove(enrollment);
            db.SaveChanges();
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

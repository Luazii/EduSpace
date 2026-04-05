using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels;

namespace LearniVerseNew.Controllers
{
    public class PaymentsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        // GET: Payments
        public ActionResult Index()
        {
            var payments = db.Payments.Include(p => p.Enrollment).Include(p => p.Student);
            return View(payments.ToList());
        }

        [Authorize(Roles = "Admin")]
        public ActionResult Payments(int? selectedMonth, string searchStudent, int? selectedYear)
        {
            IQueryable<Payment> payments = db.Payments.Include("Enrollment").Include("Student");

            if (selectedMonth.HasValue)
            {
                payments = payments.Where(p => p.PaymentDate.Month == selectedMonth);
            }
            if (!string.IsNullOrEmpty(searchStudent))
            {
                payments = payments.Where(p => p.Student.StudentFirstName.Contains(searchStudent));
            }
            if (selectedYear.HasValue)
            {
                payments = payments.Where(p => p.PaymentDate.Year == selectedYear);
            }
            return View(payments.ToList());
        }

        public ActionResult MyPayments(string studentId)
        {
            studentId = Session["UserId"].ToString();
            var payments = db.Payments.Where(s => s.StudentID == studentId);
            return View(payments.ToList());
        }

        public ActionResult PaymentSuccessful()
        {
          
            return View();
        }


        // GET: Payments/Details/5
        public ActionResult Details(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Payment payment = db.Payments.Find(id);
            if (payment == null)
            {
                return HttpNotFound();
            }
            return View(payment);
        }

        //Gym

        public ActionResult AllGymPayments(string email)
        {
            var GymPayments = db.MembershipPayments.Include(s => s.Student).Include(m => m.Membership);

            if (!string.IsNullOrEmpty(email))
            {
                GymPayments = GymPayments.Where(r => r.Student.StudentEmail.Contains(email));
            }

            return View(GymPayments.ToList());
        }

        // GET: Payments/Create
        public ActionResult Create()
        {
            ViewBag.EnrollmentID = new SelectList(db.Enrollments, "EnrollmentID", "StudentID");
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName");
            return View();
        }

        // POST: Payments/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create([Bind(Include = "PaymentID,StudentID,EnrollmentID,AmountPaid,PaymentReference,PaymentDate")] Payment payment)
        {
            if (ModelState.IsValid)
            {
                db.Payments.Add(payment);
                db.SaveChanges();
                return RedirectToAction("Index");
            }

            ViewBag.EnrollmentID = new SelectList(db.Enrollments, "EnrollmentID", "StudentID", payment.EnrollmentID);
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName", payment.StudentID);
            return View(payment);
        }

        // GET: Payments/Edit/5
        public ActionResult Edit(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Payment payment = db.Payments.Find(id);
            if (payment == null)
            {
                return HttpNotFound();
            }
            ViewBag.EnrollmentID = new SelectList(db.Enrollments, "EnrollmentID", "StudentID", payment.EnrollmentID);
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName", payment.StudentID);
            return View(payment);
        }

        // POST: Payments/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit([Bind(Include = "PaymentID,StudentID,EnrollmentID,AmountPaid,PaymentReference,PaymentDate")] Payment payment)
        {
            if (ModelState.IsValid)
            {
                db.Entry(payment).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            ViewBag.EnrollmentID = new SelectList(db.Enrollments, "EnrollmentID", "StudentID", payment.EnrollmentID);
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName", payment.StudentID);
            return View(payment);
        }

        // GET: Payments/Delete/5
        public ActionResult Delete(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Payment payment = db.Payments.Find(id);
            if (payment == null)
            {
                return HttpNotFound();
            }
            return View(payment);
        }

        // POST: Payments/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(int id)
        {
            Payment payment = db.Payments.Find(id);
            db.Payments.Remove(payment);
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

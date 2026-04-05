using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Web;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels;
using LearniVerseNew.Models.Helpers;
using Microsoft.Ajax.Utilities;
using Microsoft.AspNet.Identity;

namespace LearniVerseNew.Controllers
{
    public class BookingsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        // GET: Bookings
        [Authorize(Roles = "User")]
        public ActionResult MyBookings()
        {
            string id = User.Identity.GetUserId();
            var bookings = db.Bookings.Include(b => b.TimeSlot).Where(s=>s.StudentID == id );
            return View(bookings.ToList());
        }

        public ActionResult Index()
        {
            var bookings = db.Bookings.Include(b => b.TimeSlot);
            return View(bookings.ToList());
        }

        // GET: Bookings/Details/5
        public ActionResult Details(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Booking booking = db.Bookings.Find(id);
            if (booking == null)
            {
                return HttpNotFound();
            }
            return View(booking);
        }

        // GET: Bookings/Create
        public ActionResult Create()
        {
            string studentId = Session["UserId"].ToString();

            ViewBag.StudentId = studentId;
            ViewBag.TimeSlotID = new SelectList(db.TimeSlots, "TimeSlotID", "SlotName");

            // Fetch the list of rooms from the database
            ViewBag.RoomID = new SelectList(db.Rooms, "RoomID", "RoomID");

            return View();
        }

        // POST: Bookings/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create([Bind(Include = "BookingID,StudentID,RoomID,TimeSlotID,BookingDate")] Booking booking)
        {
            EmailHelper mailer = new EmailHelper();
            string email = User.Identity.Name;

            // Check if the booking date is in the past
            if (booking.BookingDate.Date < DateTime.Now.Date)
            {
                TempData["DateError"] = "You cannot book a session for a date in the past.";
                return RedirectToAction("Create", "Bookings");
            }

            // Check if the booking date is today and the time is in the past
            if (booking.BookingDate.Date == DateTime.Now.Date && booking.TimeSlot.EndTime <= DateTime.Now.TimeOfDay)
            {
                TempData["DateError"] = "You cannot book a session for a time in the past.";
                return RedirectToAction("Create", "Bookings");
            }

            // Check for duplicate bookings for the same room and time slot on the same day
            var existingBooking = db.Bookings.FirstOrDefault(b =>
                b.RoomID == booking.RoomID &&
                b.TimeSlotID == booking.TimeSlotID &&
                b.BookingDate == booking.BookingDate);

            if (existingBooking != null)
            {
                TempData["DateError"] = "A booking for this room and time slot on the selected date already exists.";
                return RedirectToAction("Create", "Bookings");
            }

            // Check for duplicate bookings for the same person or another person
            var existingUserBooking = db.Bookings.FirstOrDefault(b =>
                b.StudentID == booking.StudentID &&
                b.RoomID == booking.RoomID &&
                b.TimeSlotID == booking.TimeSlotID &&
                b.BookingDate == booking.BookingDate);

            if (existingUserBooking != null)
            {
                TempData["DateError"] = "You already have a booking for this room and time slot on the selected date.";
                return RedirectToAction("Create", "Bookings");
            }

            if (ModelState.IsValid)
            {
                var Timeslot = db.TimeSlots.Find(booking.TimeSlotID);
                var room = db.Rooms.Find(booking.RoomID);
                var student = db.Students.Find(booking.StudentID);

                booking.BookingID = Guid.NewGuid();
                booking.TimeSlot = Timeslot;
                booking.Room = room;
                booking.Student = student;
                db.Bookings.Add(booking);
                db.SaveChanges();
                mailer.SendEmailBooking(email, booking);
                return RedirectToAction("MyBookings");
            }

            ViewBag.TimeSlotID = new SelectList(db.TimeSlots, "TimeSlotID", "SlotName", booking.TimeSlotID);
            ViewBag.RoomID = new SelectList(db.Rooms, "RoomID", "RoomID");
            return View(booking);
        }

        // GET: Bookings/Edit/5
        public ActionResult Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Booking booking = db.Bookings.Find(id);
            if (booking == null)
            {
                return HttpNotFound();
            }
            ViewBag.TimeSlotID = new SelectList(db.TimeSlots, "TimeSlotID", "SlotName", booking.TimeSlotID);
            return View(booking);
        }

        // POST: Bookings/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit([Bind(Include = "BookingID,StudentID,RoomID,TimeSlotID,BookingDate")] Booking booking)
        {
            if (ModelState.IsValid)
            {
                db.Entry(booking).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            ViewBag.TimeSlotID = new SelectList(db.TimeSlots, "TimeSlotID", "SlotName", booking.TimeSlotID);
            return View(booking);
        }

        // GET: Bookings/Delete/5
        public ActionResult Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Booking booking = db.Bookings.Find(id);
            if (booking == null)
            {
                return HttpNotFound();
            }
            return View(booking);
        }

        // POST: Bookings/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(Guid id)
        {
            Booking booking = db.Bookings.Find(id);
            db.Bookings.Remove(booking);
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

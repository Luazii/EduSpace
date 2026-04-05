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
    public class TimeSlotsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        // GET: TimeSlots
        public ActionResult Index()
        {
            var timeSlots = db.TimeSlots.Include(t => t.Room);
            return View(timeSlots.ToList());
        }

        // GET: TimeSlots/Details/5
        public ActionResult Details(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            TimeSlot timeSlot = db.TimeSlots.Find(id);
            if (timeSlot == null)
            {
                return HttpNotFound();
            }
            return View(timeSlot);
        }

        // GET: TimeSlots/Create
        public ActionResult Create()
        {
            ViewBag.RoomID = new SelectList(db.Rooms, "RoomID", "Campus");
            return View();
        }

        // POST: TimeSlots/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create([Bind(Include = "TimeSlotID,SlotName,StartTime,EndTime,RoomID")] TimeSlot timeSlot)
        {
            if (ModelState.IsValid)
            {
                timeSlot.TimeSlotID = Guid.NewGuid();
                db.TimeSlots.Add(timeSlot);
                db.SaveChanges();
                return RedirectToAction("Index");
            }

            ViewBag.RoomID = new SelectList(db.Rooms, "RoomID", "Campus", timeSlot.RoomID);
            return View(timeSlot);
        }

        // GET: TimeSlots/Edit/5
        public ActionResult Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            TimeSlot timeSlot = db.TimeSlots.Find(id);
            if (timeSlot == null)
            {
                return HttpNotFound();
            }
            ViewBag.RoomID = new SelectList(db.Rooms, "RoomID", "Campus", timeSlot.RoomID);
            return View(timeSlot);
        }

        // POST: TimeSlots/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit([Bind(Include = "TimeSlotID,SlotName,StartTime,EndTime,RoomID")] TimeSlot timeSlot)
        {
            if (ModelState.IsValid)
            {
                db.Entry(timeSlot).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            ViewBag.RoomID = new SelectList(db.Rooms, "RoomID", "Campus", timeSlot.RoomID);
            return View(timeSlot);
        }

        // GET: TimeSlots/Delete/5
        public ActionResult Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            TimeSlot timeSlot = db.TimeSlots.Find(id);
            if (timeSlot == null)
            {
                return HttpNotFound();
            }
            return View(timeSlot);
        }

        // POST: TimeSlots/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(Guid id)
        {
            TimeSlot timeSlot = db.TimeSlots.Find(id);
            db.TimeSlots.Remove(timeSlot);
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

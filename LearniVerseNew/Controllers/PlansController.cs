using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels.Gym_Models;

namespace LearniVerseNew.Controllers
{
    public class PlansController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        // GET: Plans
        public ActionResult Index()
        {
            return View(db.Plans.ToList());
        }

        // GET: Plans/Details/5
        public ActionResult Details(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Plans plans = db.Plans.Find(id);
            if (plans == null)
            {
                return HttpNotFound();
            }
            return View(plans);
        }

        // GET: Plans/Create
        public ActionResult Create()
        {
            return View();
        }

        // POST: Plans/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create([Bind(Include = "PlanID,PlanName,PlanDuration,PlanCost")] Plans plans)
        {
            if (ModelState.IsValid)
            {
                plans.PlanID = Guid.NewGuid();
                db.Plans.Add(plans);
                db.SaveChanges();
                return RedirectToAction("Index");
            }

            return View(plans);
        }

        // GET: Plans/Edit/5
        public ActionResult Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Plans plans = db.Plans.Find(id);
            if (plans == null)
            {
                return HttpNotFound();
            }
            return View(plans);
        }

        // POST: Plans/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit([Bind(Include = "PlanID,PlanName,PlanDuration,PlanCost")] Plans plans)
        {
            if (ModelState.IsValid)
            {
                db.Entry(plans).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            return View(plans);
        }

        // GET: Plans/Delete/5
        public ActionResult Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Plans plans = db.Plans.Find(id);
            if (plans == null)
            {
                return HttpNotFound();
            }
            return View(plans);
        }

        // POST: Plans/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(Guid id)
        {
            Plans plans = db.Plans.Find(id);
            db.Plans.Remove(plans);
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

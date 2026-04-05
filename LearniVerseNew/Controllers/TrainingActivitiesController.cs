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
using LearniVerseNew.Models.ApplicationModels.Trainer_Models;

namespace LearniVerseNew.Controllers
{
    public class TrainingActivitiesController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        // GET: TrainingActivities
        public async Task<ActionResult> Index()
        {
            var trainingActivities = db.TrainingActivities.Include(t => t.Trainer);
            return View(await trainingActivities.ToListAsync());
        }

        // GET: TrainingActivities/Details/5
        public async Task<ActionResult> Details(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            TrainingActivity trainingActivity = await db.TrainingActivities.FindAsync(id);
            if (trainingActivity == null)
            {
                return HttpNotFound();
            }
            return View(trainingActivity);
        }

        // GET: TrainingActivities/Create
        public ActionResult Create()
        {
            ViewBag.TrainerID = new SelectList(db.Trainers, "TrainerID", "FirstName");
            return View();
        }

        // POST: TrainingActivities/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Create([Bind(Include = "ActivityID,ActivityName,DefaultStartTime,DafaultDuration,TrainerID")] TrainingActivity trainingActivity)
        {
            if (ModelState.IsValid)
            {
                trainingActivity.ActivityID = Guid.NewGuid();
                db.TrainingActivities.Add(trainingActivity);
                await db.SaveChangesAsync();
                return RedirectToAction("Index");
            }

            ViewBag.TrainerID = new SelectList(db.Trainers, "TrainerID", "FirstName", trainingActivity.TrainerID);
            return View(trainingActivity);
        }

        // GET: TrainingActivities/Edit/5
        public async Task<ActionResult> Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            TrainingActivity trainingActivity = await db.TrainingActivities.FindAsync(id);
            if (trainingActivity == null)
            {
                return HttpNotFound();
            }
            ViewBag.TrainerID = new SelectList(db.Trainers, "TrainerID", "FirstName", trainingActivity.TrainerID);
            return View(trainingActivity);
        }

        // POST: TrainingActivities/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Edit([Bind(Include = "ActivityID,ActivityName,DefaultStartTime,DafaultDuration,TrainerID")] TrainingActivity trainingActivity)
        {
            if (ModelState.IsValid)
            {
                db.Entry(trainingActivity).State = EntityState.Modified;
                await db.SaveChangesAsync();
                return RedirectToAction("Index");
            }
            ViewBag.TrainerID = new SelectList(db.Trainers, "TrainerID", "FirstName", trainingActivity.TrainerID);
            return View(trainingActivity);
        }

        // GET: TrainingActivities/Delete/5
        public async Task<ActionResult> Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            TrainingActivity trainingActivity = await db.TrainingActivities.FindAsync(id);
            if (trainingActivity == null)
            {
                return HttpNotFound();
            }
            return View(trainingActivity);
        }

        // POST: TrainingActivities/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> DeleteConfirmed(Guid id)
        {
            TrainingActivity trainingActivity = await db.TrainingActivities.FindAsync(id);
            db.TrainingActivities.Remove(trainingActivity);
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

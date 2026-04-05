using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using LearniVerseNew.Models;
using LearniVerseNew.Models.ApplicationModels.Gym_Models;
using Microsoft.AspNet.Identity;

namespace LearniVerseNew.Controllers
{
    public class BodyComposistionsController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();

        // GET: BodyComposistions
        public ActionResult Index()
        {
            var bodyComposistions = db.BodyComposistions.Include(b => b.Student);
            return View(bodyComposistions.ToList());
        }

        // GET: BodyComposistions/Details/5
        public ActionResult Details(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            BodyComposistion bodyComposistion = db.BodyComposistions.Find(id);
            if (bodyComposistion == null)
            {
                return HttpNotFound();
            }
            return View(bodyComposistion);
        }

        // GET: BodyComposistions/Create
        public async Task<ActionResult> NewComposition()
        {
            string id = User.Identity.GetUserId();

            ViewBag.Student = await db.Students.FindAsync(id);

            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> NewComposition(BodyComposistion model)
        {
            

            if (ModelState.IsValid)
            {
                string id = User.Identity.GetUserId();
                var student = await db.Students.FindAsync(id);

                if (student != null)
                {
                    // Calculate BMI
                    model.BMI = model.CalcBMI(model.Height, model.Weight);

                    // Calculate BMR
                    model.BMR = model.CalculateBMR(model.Height, model.Weight, student.Gender, student.DOB);

                    // Calculate Body Fat Percentage
                    model.BodyFatPercentage = model.CalculateBF(model.BMI, student.Gender, student.DOB);

                    // Calculate Lean Muscle Mass
                    model.LeanMuscleMass = model.CalcLeanMuscleMass(model.Weight, model.BodyFatPercentage);

                    // Set other model properties
                    model.BodyCompositionID = Guid.NewGuid();
                    model.DateRecorded = DateTime.Now;
                    model.StudentID = student.StudentID;
                    model.Student = student;

                    if (model.BMI >= 18.5 && model.BMI <= 24.9)
                    {
                        model.Status = "Normal";
                    }
                    else if (model.BMI >= 25 && model.BMI <= 29.9)
                    {
                        model.Status = "Overweight";
                    }
                    else if (model.BMI >= 30)
                    {
                        model.Status = "Obese";
                    }
                    else if (model.BMI < 18.5)
                    {
                        model.Status = "Underweight";
                    }


                    // Add the new composition to the database
                    db.BodyComposistions.Add(model);
                    await db.SaveChangesAsync();

                    // Optionally redirect to a confirmation page or the student's profile page
                    return RedirectToAction("MyBody");
                }
            }

            // If we got this far, something failed; redisplay form
            ViewBag.Student = await db.Students.FindAsync(User.Identity.GetUserId());

            
            return View(model);
        }


        public async Task<ActionResult> MyBody()
        {
            string id = User.Identity.GetUserId();

            // Get the latest body composition for the current user
            var latestComposition = await db.BodyComposistions
                                           .Where(bc => bc.StudentID == id)
                                           .OrderByDescending(bc => bc.DateRecorded)
                                           .FirstOrDefaultAsync();

            // Get weight and date records for the current user
            var weightRecords = await db.BodyComposistions
                                        .Where(bc => bc.StudentID == id)
                                        .OrderBy(bc => bc.DateRecorded)
                                        .Select(b => b.Weight)
                                        .ToListAsync();

            var dateRecords = await db.BodyComposistions
                                       .Where(bc => bc.StudentID == id)
                                       .OrderBy(bc => bc.DateRecorded)
                                       .Select(b => b.DateRecorded)
                                       .ToListAsync();

            var correctDateFormatDates = new List<string>();

            foreach (var date in dateRecords)
            {
                correctDateFormatDates.Add(date.ToShortDateString());
            }

            // Check if there are any records
            if (weightRecords.Count == 0 || correctDateFormatDates.Count == 0)
            {
                ViewBag.WeightRecords = new List<double>(); // Empty list
                ViewBag.DateRecords = new List<string>();   // Empty list
            }
            else
            {
                ViewBag.WeightRecords = weightRecords;
                ViewBag.DateRecords = correctDateFormatDates;
            }

            //Check if latestComposition is not null and return the record
            if(latestComposition != null)
            {
                return View(latestComposition);
            }

            //if latest composition is null redirect user to create a record 

            return RedirectToAction("NoBodyCompositions");

        }


        public ActionResult NoBodyCompositions()
        {
            return View();
        }


        public ActionResult Create()
        {
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName");
            return View();
        }


        // POST: BodyComposistions/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create([Bind(Include = "BodyCompositionID,DateRecorded,Height,Weight,BMI,Status,BMR,BodyFatPercentage,LeanMuscleMass,StudentID")] BodyComposistion bodyComposistion)
        {
            if (ModelState.IsValid)
            {
                bodyComposistion.BodyCompositionID = Guid.NewGuid();
                db.BodyComposistions.Add(bodyComposistion);
                db.SaveChanges();
                return RedirectToAction("Index");
            }

            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName", bodyComposistion.StudentID);
            return View(bodyComposistion);
        }

        // GET: BodyComposistions/Edit/5
        public ActionResult Edit(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            BodyComposistion bodyComposistion = db.BodyComposistions.Find(id);
            if (bodyComposistion == null)
            {
                return HttpNotFound();
            }
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName", bodyComposistion.StudentID);
            return View(bodyComposistion);
        }

        // POST: BodyComposistions/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit([Bind(Include = "BodyCompositionID,DateRecorded,Height,Weight,BMI,Status,BMR,BodyFatPercentage,LeanMuscleMass,StudentID")] BodyComposistion bodyComposistion)
        {
            if (ModelState.IsValid)
            {
                db.Entry(bodyComposistion).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            ViewBag.StudentID = new SelectList(db.Students, "StudentID", "StudentFirstName", bodyComposistion.StudentID);
            return View(bodyComposistion);
        }

        // GET: BodyComposistions/Delete/5
        public ActionResult Delete(Guid? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            BodyComposistion bodyComposistion = db.BodyComposistions.Find(id);
            if (bodyComposistion == null)
            {
                return HttpNotFound();
            }
            return View(bodyComposistion);
        }

        // POST: BodyComposistions/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(Guid id)
        {
            BodyComposistion bodyComposistion = db.BodyComposistions.Find(id);
            db.BodyComposistions.Remove(bodyComposistion);
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

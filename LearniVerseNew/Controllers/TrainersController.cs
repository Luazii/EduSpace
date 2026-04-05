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
using Microsoft.AspNet.Identity.EntityFramework;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.Owin;
using LearniVerseNew.Models.ApplicationModels.ViewModels;
using LearniVerseNew.Models.ApplicationModels;

namespace LearniVerseNew.Controllers
{
    public class TrainersController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();
        private ApplicationUserManager _userManager;
        private RoleManager<IdentityRole> _roleManager;

        public TrainersController()
        {

        }

        public TrainersController(ApplicationUserManager userManager, RoleManager<IdentityRole> roleManager)
        {
            UserManager = userManager;
            RoleManager = roleManager;

        }

        public ApplicationUserManager UserManager
        {
            get
            {
                return _userManager ?? HttpContext.GetOwinContext().GetUserManager<ApplicationUserManager>();
            }
            private set
            {
                _userManager = value;
            }
        }

        public RoleManager<IdentityRole> RoleManager
        {
            get
            {
                return _roleManager ?? HttpContext.GetOwinContext().Get<RoleManager<IdentityRole>>();
            }
            private set
            {
                _roleManager = value;
            }
        }

        [Authorize(Roles = "PersonalTrainer")]
        public async Task<ActionResult> Dashboard()
        {
            // Get the logged-in trainer's ID
            var trainerId = User.Identity.GetUserId();

            // Fetch today's sessions for the trainer
            var today = DateTime.Today;
            var todaysSessions = await db.TrainingSessions
                                         .Where(ts => ts.TrainerID == trainerId && ts.SessionDate == today)
                                         .ToListAsync();

            // Fetch total participants across all sessions
            var totalParticipants = await db.TrainingSessions
                                            .Where(ts => ts.TrainerID == trainerId)
                                            .SelectMany(ts => ts.Participants)
                                            .CountAsync();

            // Fetch all upcoming sessions for the trainer
            var upcomingSessions = await db.TrainingSessions
                                           .Where(ts => ts.TrainerID == trainerId && ts.SessionDate >= today)
                                           .ToListAsync();

            var viewModel = new TrainerDashboardViewModel
            {
                TodaySessions = todaysSessions,
                TotalParticipants = totalParticipants,
                UpcomingSessions = upcomingSessions
            };

            return View(viewModel);
        }

        [Authorize(Roles = "PersonalTrainer")]
        public async Task<ActionResult> ViewSessionParticipants(Guid sessionId)
        {
            // Find the session and include participants (students)
            var session = await db.TrainingSessions
                                 .Include(ts => ts.Participants)
                                 .FirstOrDefaultAsync(ts => ts.TrainingSessionID == sessionId);

            if (session == null)
            {
                return HttpNotFound("Session not found.");
            }

            return View(session);
        }

        // GET: Trainers
        public async Task<ActionResult> Index()
        {
            return View(await db.Trainers.ToListAsync());
        }

        // GET: Trainers/Details/5
        public async Task<ActionResult> Details(string id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Trainer trainer = await db.Trainers.FindAsync(id);
            if (trainer == null)
            {
                return HttpNotFound();
            }
            return View(trainer);
        }

        // GET: Trainers/Create
        public ActionResult Create()
        {
            return View();
        }

        // POST: Trainers/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Create([Bind(Include = "TrainerFirstName,TrainerLastName,TrainerEmail,TrainerPhoneNumber,Specialization,Gender,Password,ConfirmPassword")] RegisterTrainerViewModel model)
        {
           
            if (ModelState.IsValid)
            {
                var user = new ApplicationUser
                {
                    UserName = model.TrainerEmail,
                    Email = model.TrainerEmail
                };

                var result = await UserManager.CreateAsync(user, model.Password);

                if (result.Succeeded)
                {
                    await UserManager.AddToRoleAsync(user.Id, "PersonalTrainer");
                    var userId = user.Id;

                    var trainer = new Trainer()
                    {
                        TrainerID = userId,
                        FirstName = model.TrainerFirstName,
                        LastName = model.TrainerLastName,
                        Email = model.TrainerEmail,
                        PhoneNumber = model.TrainerPhoneNumber,
                        Specialization = model.Specialization,
                        Gender = model.Gender
                    };

                    db.Trainers.Add(trainer);
                    await db.SaveChangesAsync();
                    return RedirectToAction("Index");
                }

            }

            return View(model);
        }

        // GET: Trainers/Edit/5
        public async Task<ActionResult> Edit(string id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Trainer trainer = await db.Trainers.FindAsync(id);
            if (trainer == null)
            {
                return HttpNotFound();
            }
            return View(trainer);
        }

        // POST: Trainers/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Edit([Bind(Include = "TrainerID,FirstName,LastName,Email,Gender,PhoneNumber,Specialization")] Trainer trainer)
        {
            if (ModelState.IsValid)
            {
                db.Entry(trainer).State = EntityState.Modified;
                await db.SaveChangesAsync();
                return RedirectToAction("Index");
            }

            return View(trainer);
        }

        // GET: Trainers/Delete/5
        public async Task<ActionResult> Delete(string id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Trainer trainer = await db.Trainers.FindAsync(id);
            if (trainer == null)
            {
                return HttpNotFound();
            }
            return View(trainer);
        }

        // POST: Trainers/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> DeleteConfirmed(string id)
        {
            Trainer trainer = await db.Trainers.FindAsync(id);
            db.Trainers.Remove(trainer);
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

"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";


import { FeatureGrid } from "@/components/feature-grid";
import { ActiveCoursesGrid } from "@/components/dashboard/active-courses-grid";
import { ApplicationStatusCard } from "@/components/dashboard/application-status-card";
import { TeacherDashboard } from "@/components/teacher/teacher-dashboard";
import { api } from "../../../../convex/_generated/api";
import { Clock, Bell, Calendar, PlayCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function DashboardPage() {
  const user = useQuery(api.users.current);
  const activeCourses = useQuery(api.enrollments.listMyActiveCourses);
  const applications = useQuery(api.enrollments.listMine) ?? [];
  const deadlines = useQuery(api.enrollments.listAllMyDeadlines) ?? [];
  const liveSessions = useQuery(api.enrollments.listAllMyLiveSessions) ?? [];
  const claimEnrollments = useMutation(api.enrollments.claimMyEnrollments);
  const claimedRef = useRef(false);

  // Auto-claim pending enrollments on first load (handles Google sign-in bypass)
  useEffect(() => {
    if (!user || claimedRef.current) return;
    if (user.role === "teacher" || user.role === "admin") return;
    claimedRef.current = true;
    void claimEnrollments();
  }, [user, claimEnrollments]);
  
  if (user?.role === "teacher") {
    return <TeacherDashboard />;
  }

  const enrolled = activeCourses && activeCourses.length > 0;
  
  // Find the most relevant application to show (submitted or rejected)
  const activeApplication = applications.find(
    app => ["submitted", "pre_approved", "approved", "rejected"].includes(app.status)
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      <div className="grid w-full gap-10">

        
        {enrolled ? (
          <div className="grid gap-10 lg:grid-cols-[1fr_350px]">
            <div className="space-y-10">
              <div className="flex flex-col gap-3">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-700">
                  Academic Progress Hub
                </p>
                <h2 className="text-4xl font-black tracking-tight text-slate-950">
                  Welcome back! Your academic schedule is active.
                </h2>
              </div>
              <ActiveCoursesGrid />
            </div>

            {/* Urgency Sidebar */}
            <aside className="space-y-8">
              {liveSessions.length > 0 && (
                <div className="rounded-4xl bg-slate-950 p-8 text-white shadow-xl shadow-slate-950/20">
                  <div className="flex items-center gap-3 mb-6">
                    <PlayCircle className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-bold text-sm uppercase tracking-widest">Live Now</h3>
                  </div>
                  <div className="space-y-4">
                    {liveSessions.map(session => (
                      <Link key={session._id} href={session.meetingUrl} target="_blank" className="block group">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">{session.courseCode}</p>
                        <h4 className="font-bold text-sm leading-tight group-hover:text-emerald-400 transition">{session.title}</h4>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full animate-pulse">Happening Now</span>
                          <span className="text-[10px] text-white/40">{format(session.endTime, "p")}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="h-5 w-5 text-sky-600" />
                  <h3 className="font-bold text-sm uppercase tracking-widest text-slate-950">Next Priorities</h3>
                </div>
                {deadlines.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No upcoming deadlines detected.</p>
                ) : (
                  <div className="space-y-6">
                    {deadlines.map(deadline => (
                      <div key={deadline._id} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:h-2 before:w-2 before:rounded-full before:bg-sky-500">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{deadline.courseCode}</p>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight mb-2">{deadline.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {format(deadline.deadline!, "MMM d, p")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-4xl border border-slate-100 bg-slate-50/50 p-8">
                 <div className="flex items-center gap-3 mb-4 text-slate-400">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="font-bold text-[10px] uppercase tracking-widest">Academic Status</h3>
                </div>
                <p className="text-xs font-bold text-slate-900">Registered · Level 1</p>
                <p className="mt-1 text-xs text-slate-500">All documentation certified & verified.</p>
              </div>
            </aside>
          </div>
        ) : activeApplication ? (
          <div className="space-y-10">
             <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7c4dff]">
                Admissions Monitoring
              </p>
              <h2 className="text-4xl font-black tracking-tight text-slate-950">
                Application Review Center
              </h2>
            </div>
            <ApplicationStatusCard application={activeApplication} />
          </div>
        ) : (
          <FeatureGrid />
        )}
      </div>
    </main>
  );
}

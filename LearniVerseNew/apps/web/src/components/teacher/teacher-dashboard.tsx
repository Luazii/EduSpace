"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { format } from "date-fns";
import { CalendarDays, Clock, Video, MapPin } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { CourseSettingsPanel } from "./course-settings-panel";

export function TeacherDashboard() {
  const currentUser = useQuery(api.users.current);
  const courseOverview = useQuery(api.courses.listTeachingDashboard);
  const gradingQueue = useQuery(api.submissions.listNeedsGrading);
  const meetings = useQuery(api.meetings.listMyMeetings) ?? [];
  const confirmAttendance = useMutation(api.meetings.confirmAttendance);
  const bookingRequests = useQuery(api.teacherBookings.listIncomingRequests);

  const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null);

  const pendingBookings = bookingRequests?.filter(
    (b) => b.status === "pending" || b.status === "reschedule_proposed",
  ).length ?? 0;

  const totals = courseOverview ? {
    courses: courseOverview.length,
    assignments: courseOverview.reduce((sum, c) => sum + (c.assignmentsCount || 0), 0),
    quizzes: courseOverview.reduce((sum, c) => sum + (c.quizzesCount || 0), 0),
    pending: courseOverview.reduce((sum, c) => sum + (c.pendingGradingCount || 0), 0),
  } : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-6 py-14 sm:px-10">
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white/70 p-10 shadow-[0_22px_70px_rgba(15,23,42,0.04)] backdrop-blur-xl">
        <div className="relative z-10 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-700">
            Faculty Workspace
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
            Welcome back, {currentUser?.fullName?.split(" ")[0] ?? "Teacher"}.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">
            Assess student performance, manage curriculum materials, and oversee your assigned classrooms from one central hub.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Assigned Courses"
              value={totals ? String(totals.courses) : "..."}
              icon={<CourseIcon />}
            />
            <StatCard
              label="Learning Units"
              value={totals ? String(totals.assignments) : "..."}
              icon={<AssignmentIcon />}
            />
            <StatCard
              label="Evaluations"
              value={totals ? String(totals.quizzes) : "..."}
              icon={<QuizIcon />}
            />
            <StatCard
              label="Submissions Needing Grading"
              value={totals ? String(totals.pending) : "..."}
              isHighlight
              icon={<PendingIcon />}
            />
            <Link href="/bookings/requests" className="block">
              <StatCard
                label="Pending Meeting Requests"
                value={bookingRequests !== undefined ? String(pendingBookings) : "..."}
                isHighlight={pendingBookings > 0}
                icon={<CalendarDays className="h-6 w-6" />}
              />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Left Column: Course Overview */}
        <div className="space-y-6">
          <header className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">My Classrooms</h2>
            <Link href="/teacher/reports" className="text-sm font-semibold text-sky-700 hover:text-sky-900 transition">
              View Academic Reports &rarr;
            </Link>
          </header>

          <div className="grid gap-6">
            {courseOverview === undefined ? (
              <div className="h-64 animate-pulse rounded-4xl bg-slate-100" />
            ) : courseOverview.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-300 bg-white/50 p-20 text-center">
                <p className="text-sm text-slate-500">No courses assigned to you yet.</p>
              </div>
            ) : (
              courseOverview.map((course) => (
                <div key={course._id} className="space-y-4">
                  <div className="group relative flex flex-col overflow-hidden rounded-4xl border border-slate-200 bg-white/60 transition hover:bg-white hover:shadow-[0_15px_40px_rgba(15,23,42,0.04)] backdrop-blur-sm">
                    <div className="flex flex-col p-8">
                      <div className="flex flex-wrap items-start justify-between gap-6">
                        <Link href={`/courses/${course._id}`} className="space-y-1 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            {course.courseCode}
                          </p>
                          <h3 className="text-2xl font-semibold tracking-tight text-slate-950 group-hover:text-sky-900">
                            {course.courseName}
                          </h3>
                          <p className="text-sm text-slate-500">{course.department}</p>
                        </Link>
                        <div className="flex flex-col items-end gap-3 text-right">
                          <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            course.pendingGradingCount > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {course.pendingGradingCount} Pending Items
                          </span>
                        </div>
                      </div>
                      <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 text-sm md:grid-cols-4">
                        <CourseStat label="Resources" value={course.resourcesCount} />
                        <CourseStat label="Assignments" value={course.assignmentsCount} />
                        <CourseStat label="Quizzes" value={course.quizzesCount} />
                        <CourseStat label="Total Submissions" value={course.latestSubmissionsCount} />
                      </div>

                      {/* Quick-action buttons */}
                      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                        <Link
                          href={`/courses/${course._id}`}
                          className="rounded-full bg-slate-950 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-slate-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open Classroom
                        </Link>
                        <Link
                          href={`/courses/${course._id}?tab=resources`}
                          className="rounded-full border border-slate-200 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-600 transition hover:border-slate-950 hover:text-slate-950"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Upload Material
                        </Link>
                        <Link
                          href={`/courses/${course._id}?tab=assignments`}
                          className="rounded-full border border-slate-200 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-600 transition hover:border-slate-950 hover:text-slate-950"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Assignments
                        </Link>
                        <Link
                          href={`/courses/${course._id}?tab=quizzes`}
                          className="rounded-full border border-slate-200 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-600 transition hover:border-slate-950 hover:text-slate-950"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Quizzes
                        </Link>
                        <Link
                          href={`/courses/${course._id}?tab=live`}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-emerald-700 transition hover:bg-emerald-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Live Classes
                        </Link>
                      </div>

                      <div className="mt-8 flex flex-wrap gap-3">
                         <Link 
                          href={`/courses/${course._id}`}
                          className="flex-1 rounded-2xl bg-slate-950 px-6 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-sky-700 shadow-lg shadow-slate-950/10"
                        >
                          Explore Classroom
                        </Link>
                        <button
                          onClick={() => setActiveSettingsId(activeSettingsId === course._id ? null : course._id)}
                          className={`rounded-2xl border px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition ${
                            activeSettingsId === course._id 
                              ? "bg-sky-50 border-sky-200 text-sky-700" 
                              : "border-slate-200 text-slate-600 hover:border-slate-950 hover:text-slate-950"
                          }`}
                        >
                          {activeSettingsId === course._id ? "Close Settings" : "Manage Content"}
                        </button>
                        {course.pendingGradingCount > 0 && (
                           <Link 
                            href={`/courses/${course._id}?tab=submissions`}
                            className="rounded-2xl bg-amber-500 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-amber-600 shadow-lg shadow-amber-500/20"
                          >
                            Grade Submissions
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  {activeSettingsId === course._id && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <CourseSettingsPanel course={course} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Grading Queue + Meetings */}
        <aside className="space-y-10">
          <div className="space-y-6">
            <header>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">Grading Queue</h2>
              <p className="mt-1 text-sm text-slate-500">Submissions awaiting your review.</p>
            </header>

            <div className="grid gap-3">
              {gradingQueue === undefined ? (
                <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
              ) : gradingQueue.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  You're all caught up!
                </div>
              ) : (
                gradingQueue.map((submission) => (
                  <Link
                    key={submission._id}
                    href={`/courses/${submission.course?._id}`}
                    className="group block rounded-3xl border border-slate-100 bg-white/60 p-5 transition hover:bg-white hover:shadow-lg"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                      {submission.course?.courseCode}
                    </p>
                    <h4 className="mt-1 font-semibold text-slate-950">{submission.assignment?.title}</h4>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-slate-500">{submission.student?.fullName}</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Booking Requests Section */}
          <div className="space-y-6">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">Booking Requests</h2>
                <p className="mt-1 text-sm text-slate-500">Student meeting requests awaiting action.</p>
              </div>
              <Link
                href="/bookings/requests"
                className="text-sm font-semibold text-sky-700 hover:text-sky-900 transition"
              >
                Manage All →
              </Link>
            </header>

            <div className="grid gap-3">
              {bookingRequests === undefined ? (
                <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
              ) : (() => {
                const pending = bookingRequests.filter(
                  (b) => b.status === "pending" || b.status === "reschedule_proposed",
                );
                return pending.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    No pending requests.
                  </div>
                ) : (
                  pending.slice(0, 3).map((req) => (
                    <Link
                      key={req._id}
                      href="/bookings/requests"
                      className="group block rounded-3xl border border-amber-100 bg-amber-50/40 p-5 transition hover:bg-white hover:shadow-lg hover:border-slate-200"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="font-semibold text-slate-950 text-sm">
                          {req.student?.fullName ?? req.student?.email}
                        </p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                          req.status === "reschedule_proposed"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {req.status === "reschedule_proposed" ? "Awaiting Response" : "Pending"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(req.startTime, "EEE d MMM")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(req.startTime, "HH:mm")}
                        </span>
                        <span className="flex items-center gap-1">
                          {req.meetingType === "online"
                            ? <><Video className="h-3 w-3" /> Online</>
                            : <><MapPin className="h-3 w-3" /> In-Person</>
                          }
                        </span>
                      </div>
                    </Link>
                  ))
                );
              })()}
            </div>
          </div>

          {/* Meetings Section */}
          <div className="space-y-6">
            <header>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">Scheduled Meetings</h2>
              <p className="mt-1 text-sm text-slate-500">Engagements arranged by administration.</p>
            </header>

            <div className="grid gap-3">
              {meetings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  No meetings scheduled.
                </div>
              ) : (
                meetings.map((meet) => (
                  <div
                    key={meet._id}
                    className="rounded-3xl border border-slate-100 bg-white/60 p-5"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-slate-950 text-sm leading-tight">{meet.title}</h4>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                        meet.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                        meet.status === "confirmed" ? "bg-sky-50 text-sky-700" :
                        "bg-amber-50 text-amber-700"
                      }`}>
                        {meet.status}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mb-3">
                      {format(meet.startTime, "PPP")} · {format(meet.startTime, "p")}
                    </p>
                    {meet.status === "scheduled" && (
                      <button
                        onClick={() => confirmAttendance({ meetingId: meet._id })}
                        className="w-full rounded-xl bg-slate-950 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-sky-700"
                      >
                        Confirm Attendance
                      </button>
                    )}
                    {meet.status === "confirmed" && (
                      <div className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-50 py-2 text-[10px] font-black uppercase tracking-widest text-sky-700">
                        ✓ Attendance Confirmed
                      </div>
                    )}
                    {meet.status === "completed" && meet.outcomeNotes && (
                      <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-2">"{meet.outcomeNotes}"</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon, isHighlight }: { label: string; value: string; icon: React.ReactNode; isHighlight?: boolean }) {
  return (
    <div className={`rounded-3xl border p-6 transition ${
      isHighlight 
        ? "border-amber-200 bg-amber-50/50 shadow-[0_8px_30px_rgba(251,191,36,0.08)]" 
        : "border-slate-100 bg-white/80 hover:border-slate-200"
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          isHighlight ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
        }`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function CourseStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

// Icons
function CourseIcon() { return <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> }
function AssignmentIcon() { return <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> }
function QuizIcon() { return <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> }
function PendingIcon() { return <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }

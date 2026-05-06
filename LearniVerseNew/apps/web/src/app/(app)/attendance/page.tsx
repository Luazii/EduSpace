"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Clock, BookOpen, BarChart3, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_CFG = {
  present: { label: "Present", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  late: { label: "Late", icon: Clock, color: "text-amber-600", bg: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  absent: { label: "Absent", icon: XCircle, color: "text-rose-600", bg: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  excused: { label: "Excused", icon: CheckCircle2, color: "text-sky-600", bg: "bg-sky-50 text-sky-700", dot: "bg-sky-400" },
};

export default function AttendancePage() {
  const attendance = useQuery(api.attendance.getMyAttendance, {});
  const [expanded, setExpanded] = useState<string | null>(null);

  if (attendance === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Academic</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Attendance Record</h1>
        <p className="mt-2 text-sm text-slate-500">Your attendance across all enrolled subjects.</p>
      </header>

      {attendance.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
          <BarChart3 className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="font-bold text-slate-600">No attendance records yet</h3>
          <p className="mt-1 text-sm text-slate-400">Records will appear once your teacher marks attendance.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {attendance.map((course) => {
            const isExpanded = expanded === course.courseId;
            const pct = course.percent;
            const barColor = pct == null ? "bg-slate-200" : pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-rose-500";

            return (
              <section key={course.courseId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <button
                  onClick={() => setExpanded(isExpanded ? null : course.courseId)}
                  className="flex w-full items-center gap-5 p-6 text-left transition hover:bg-slate-50/50"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50">
                    <BookOpen className="h-6 w-6 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-950">{course.courseName}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-widest">{course.courseCode}</p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                      <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct ?? 0}%` }} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-2xl font-black ${pct == null ? "text-slate-300" : pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                      {pct != null ? `${pct}%` : "—"}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">{course.present}/{course.total} sessions</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" /> : <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />}
                </button>

                {/* Stats row */}
                <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/40">
                  {[
                    { label: "Present", value: course.present, color: "text-emerald-600" },
                    { label: "Late", value: course.late, color: "text-amber-600" },
                    { label: "Absent", value: course.absent, color: "text-rose-600" },
                    { label: "Excused", value: course.excused, color: "text-sky-600" },
                  ].map((s) => (
                    <div key={s.label} className="py-3 text-center">
                      <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Detailed records */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-6">
                    {course.records.length === 0 ? (
                      <p className="text-xs text-slate-400">No sessions recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {course.records.map((r) => {
                          const cfg = STATUS_CFG[r.status as keyof typeof STATUS_CFG];
                          return (
                            <div key={r._id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                              <span className="text-sm font-medium text-slate-700">
                                {format(new Date(r.sessionDate), "EEEE, d MMMM yyyy")}
                              </span>
                              <div className="flex items-center gap-2">
                                {r.notes && <span className="text-[10px] italic text-slate-400">{r.notes}</span>}
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${cfg.bg}`}>{cfg.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

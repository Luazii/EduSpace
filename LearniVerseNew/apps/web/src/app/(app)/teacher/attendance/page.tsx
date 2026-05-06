"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Save, BookOpen } from "lucide-react";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "Present", color: "bg-emerald-600 text-white" },
  { value: "late", label: "Late", color: "bg-amber-500 text-white" },
  { value: "absent", label: "Absent", color: "bg-rose-600 text-white" },
  { value: "excused", label: "Excused", color: "bg-sky-500 text-white" },
];

export default function TeacherAttendancePage() {
  const myCourses = useQuery(api.manualMarks.listMyCourses);
  const [selectedCourse, setSelectedCourse] = useState<Id<"courses"> | null>(null);
  const [sessionDate, setSessionDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const students = useQuery(
    api.attendance.listEnrolledStudents,
    selectedCourse ? { courseId: selectedCourse } : "skip",
  );

  const markAttendance = useMutation(api.attendance.markAttendance);

  const handleSave = async () => {
    if (!selectedCourse) return;
    setSaving(true);
    try {
      const records = (students ?? []).map((s) => ({
        studentUserId: s.userId,
        status: marks[s.userId] ?? "absent",
      }));
      await markAttendance({
        courseId: selectedCourse,
        sessionDate: new Date(sessionDate).setHours(12, 0, 0, 0),
        records,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status: AttendanceStatus) => {
    const newMarks: Record<string, AttendanceStatus> = {};
    for (const s of students ?? []) newMarks[s.userId] = status;
    setMarks(newMarks);
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Teaching Tools</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Mark Attendance</h1>
      </header>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Subject</label>
          <select
            value={selectedCourse ?? ""}
            onChange={(e) => { setSelectedCourse(e.target.value as Id<"courses"> || null); setMarks({}); }}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
          >
            <option value="">Select subject…</option>
            {(myCourses ?? []).map((c) => (
              <option key={c._id} value={c._id}>{c.courseName} ({c.courseCode})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Session date</label>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
          />
        </div>
      </div>

      {selectedCourse && students !== undefined && (
        <>
          {/* Quick-mark all */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Mark all:</span>
            {STATUS_OPTIONS.map((s) => (
              <button key={s.value} onClick={() => markAll(s.value)} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition hover:opacity-90 ${s.color}`}>
                {s.label}
              </button>
            ))}
          </div>

          {students.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-400">No enrolled students in this subject.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <p className="text-sm font-bold text-slate-700">{students.length} students · {format(new Date(sessionDate), "d MMMM yyyy")}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {students.map((s) => {
                  const current = marks[s.userId] ?? null;
                  return (
                    <div key={s.userId} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-600">
                          {(s.fullName ?? "?")[0]}
                        </div>
                        <span className="font-bold text-slate-900">{s.fullName}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setMarks((prev) => ({ ...prev, [s.userId]: opt.value }))}
                            className={`rounded-xl px-3 py-1.5 text-[10px] font-black transition ${current === opt.value ? opt.color : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            {saved && (
              <span className="mr-4 flex items-center gap-2 text-sm font-bold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Attendance saved
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || students.length === 0}
              className="flex items-center gap-2 rounded-2xl bg-slate-950 px-8 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save attendance"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

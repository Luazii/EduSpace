import Link from "next/link";

import { TeacherDashboard } from "@/components/teacher/teacher-dashboard";

export default function TeacherPage() {
  return (
    <div className="space-y-6">
      <div className="mx-auto flex w-full max-w-6xl px-6 pt-8 sm:px-10">
        <div className="flex gap-3">
          <Link
            href="/teacher/manual-marks"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
          >
            Manual Mark Capture
          </Link>
          <Link
            href="/teacher/attendance"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
          >
            Mark Attendance
          </Link>
        </div>
      </div>
      <TeacherDashboard />
    </div>
  );
}

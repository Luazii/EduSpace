"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../convex/_generated/api";
import { ArrowLeft, Clock, User, CheckCircle2, Activity } from "lucide-react";

function formatTime(ms: number) {
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ProctorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const sessions = useQuery(api.quizSessions.listActiveSessions, {
    courseId: courseId as Id<"courses">,
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-10">
        <Link
          href="/teacher"
          className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Teacher Dashboard
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7c4dff]">
              Live View
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
              Quiz Proctor
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              Real-time view of active student sessions. Updates automatically.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2">
            <Activity className="h-4 w-4 text-emerald-600 animate-pulse" />
            <span className="text-xs font-black text-emerald-700">
              {sessions?.length ?? 0} active
            </span>
          </div>
        </div>
      </header>

      {sessions === undefined ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7c4dff] border-t-transparent" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-200 bg-white py-24 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-slate-200" />
          <h3 className="font-bold text-slate-950">No Active Sessions</h3>
          <p className="mt-2 text-sm text-slate-500">
            Students taking quizzes will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Student
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Quiz
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Question
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Answered
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Time Left
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => {
                const isLow =
                  session.timeRemainingMs !== null && session.timeRemainingMs < 120_000;
                return (
                  <tr key={session._id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                          {session.student?.fullName?.[0] ?? <User className="h-3 w-3" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {session.student?.fullName ?? "Unknown"}
                          </p>
                          <p className="text-xs text-slate-400">{session.student?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {session.quizTitle}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-950">
                      Q{session.currentQuestionIndex + 1}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#7c4dff]/10 px-3 py-1 text-xs font-black text-[#7c4dff]">
                        {session.answeredCount} answered
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {session.timeRemainingMs !== null ? (
                        <span
                          className={`font-black tabular-nums ${
                            isLow ? "text-rose-600" : "text-slate-900"
                          }`}
                        >
                          <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                          {formatTime(session.timeRemainingMs)}
                        </span>
                      ) : (
                        <span className="text-slate-400">No limit</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

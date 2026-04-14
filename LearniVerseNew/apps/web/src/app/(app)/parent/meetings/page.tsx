"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  Video,
  Users,
} from "lucide-react";
import { format } from "date-fns";

function statusChip(status: string) {
  const map: Record<string, string> = {
    scheduled: "bg-sky-50 text-sky-700 border-sky-100",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    completed: "bg-slate-100 text-slate-600 border-slate-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-100",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${cls}`}
    >
      {status}
    </span>
  );
}

export default function ParentMeetingsPage() {
  const meetings = useQuery(api.meetings.listMyMeetings) ?? [];
  const confirmAttendance = useMutation(api.meetings.confirmAttendance);

  const upcoming = meetings.filter(
    (m) => m.startTime > Date.now() && m.status !== "cancelled",
  );
  const past = meetings.filter(
    (m) => m.startTime <= Date.now() || m.status === "completed" || m.status === "cancelled",
  );

  if (meetings === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-950 border-t-transparent" />
      </div>
    );
  }

  function MeetingCard({
    meeting,
  }: {
    meeting: (typeof meetings)[number];
  }) {
    const duration = Math.round((meeting.endTime - meeting.startTime) / 60_000);
    return (
      <div className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-md hover:shadow-slate-200/30">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {statusChip(meeting.status)}
              {meeting.outcomeNotes && (
                <span className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-violet-700">
                  Outcome Recorded
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-slate-950">{meeting.title}</h3>
            {meeting.description && (
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                {meeting.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-5 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 text-slate-400" />
                {format(meeting.startTime, "EEEE, MMMM d yyyy")}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                {format(meeting.startTime, "p")} – {format(meeting.endTime, "p")}
                <span className="text-slate-400">({duration} min)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-400" />
                {meeting.participantIds.length} participant
                {meeting.participantIds.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {meeting.outcomeNotes && (
          <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-1">
              Meeting Notes
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {meeting.outcomeNotes}
            </p>
          </div>
        )}

        {meeting.status === "scheduled" && meeting.startTime > Date.now() && (
          <div className="mt-6">
            <button
              onClick={() => confirmAttendance({ meetingId: meeting._id })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-emerald-600"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm Attendance
            </button>
          </div>
        )}

        {meeting.status === "confirmed" && (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 py-3 text-xs font-black uppercase tracking-widest text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Attendance Confirmed
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-14 sm:px-10">
      {/* Header */}
      <header className="mb-12">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7c4dff]">
          Parent Portal
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          Meeting Schedule
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
          View and confirm your attendance for upcoming school meetings,
          parent–teacher conferences, and consultations.
        </p>
      </header>

      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-200 bg-white py-24 text-center">
          <CalendarClock className="mb-4 h-12 w-12 text-slate-200" />
          <h3 className="font-bold text-slate-950">No Meetings Scheduled</h3>
          <p className="mt-2 text-sm text-slate-500">
            You have no upcoming meetings. Check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-5 text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                Upcoming
              </h2>
              <div className="space-y-5">
                {upcoming
                  .sort((a, b) => a.startTime - b.startTime)
                  .map((m) => (
                    <MeetingCard key={m._id} meeting={m} />
                  ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-5 text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                Past Meetings
              </h2>
              <div className="space-y-5 opacity-75">
                {past
                  .sort((a, b) => b.startTime - a.startTime)
                  .map((m) => (
                    <MeetingCard key={m._id} meeting={m} />
                  ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

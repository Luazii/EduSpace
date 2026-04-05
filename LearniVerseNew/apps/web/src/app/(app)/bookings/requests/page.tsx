"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG = {
  pending: { label: "Pending", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  accepted: { label: "Confirmed", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Declined", classes: "bg-rose-50 text-rose-700 border-rose-200" },
  reschedule_proposed: { label: "Reschedule Proposed", classes: "bg-violet-50 text-violet-700 border-violet-200" },
  completed: { label: "Completed", classes: "bg-slate-100 text-slate-600 border-slate-200" },
  cancelled: { label: "Cancelled", classes: "bg-slate-50 text-slate-400 border-slate-200" },
} as const;

type Tab = "pending" | "all" | "settings";

export default function BookingRequestsPage() {
  const currentUser = useQuery(api.users.current);
  const bookings = useQuery(api.teacherBookings.listIncomingRequests);

  const acceptBooking = useMutation(api.teacherBookings.acceptBooking);
  const rejectBooking = useMutation(api.teacherBookings.rejectBooking);
  const proposeNewTime = useMutation(api.teacherBookings.proposeNewTime);
  const upsertSettings = useMutation(api.teacherBookings.upsertAvailabilitySettings);

  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<Id<"teacherBookings"> | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Reschedule modal state
  const [rescheduleTarget, setRescheduleTarget] = useState<Id<"teacherBookings"> | null>(null);
  const [proposedStart, setProposedStart] = useState("");
  const [proposedEnd, setProposedEnd] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");

  // Settings state
  const [slotDuration, setSlotDuration] = useState<30 | 60>(30);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("16:00");
  const [settingsSaved, setSettingsSaved] = useState(false);

  const pending = useMemo(
    () => bookings?.filter((b) => b.status === "pending" || b.status === "reschedule_proposed") ?? [],
    [bookings],
  );
  const all = bookings ?? [];

  async function act(id: Id<"teacherBookings">, fn: () => Promise<void>) {
    setLoadingId(id);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    await act(rejectTarget, () =>
      rejectBooking({ bookingId: rejectTarget, reason: rejectReason.trim() || undefined }),
    );
    setRejectTarget(null);
    setRejectReason("");
  }

  async function handlePropose() {
    if (!rescheduleTarget || !proposedStart || !proposedEnd) return;
    await act(rescheduleTarget, () =>
      proposeNewTime({
        bookingId: rescheduleTarget,
        proposedStartTime: new Date(proposedStart).getTime(),
        proposedEndTime: new Date(proposedEnd).getTime(),
        rescheduleNote: rescheduleNote.trim() || undefined,
      }),
    );
    setRescheduleTarget(null);
    setProposedStart("");
    setProposedEnd("");
    setRescheduleNote("");
  }

  async function handleSaveSettings() {
    setError(null);
    try {
      await upsertSettings({
        slotDurationMinutes: slotDuration,
        workDayStart: workStart,
        workDayEnd: workEnd,
        workDays: [1, 2, 3, 4, 5],
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (e: any) {
      setError(e.message ?? "Failed to save settings.");
    }
  }

  const displayedBookings = activeTab === "pending" ? pending : all;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-14 sm:px-10">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-700">
            Booking Management
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">
            Student Requests
          </h1>
        </div>
        {pending.length > 0 && (
          <span className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-black text-amber-700">
            {pending.length} pending
          </span>
        )}
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-1">
        {(["pending", "all", "settings"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-5 py-2.5 text-sm font-semibold capitalize transition ${
              activeTab === tab
                ? "text-slate-950"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab === "pending" ? "Pending" : tab === "all" ? "All Requests" : "Availability Settings"}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 h-0.5 w-full bg-slate-950" />
            )}
            {tab === "pending" && pending.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Settings tab */}
      {activeTab === "settings" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-7 max-w-md">
          <header>
            <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-400" />
              Availability Settings
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Configure when students can book meetings with you.
            </p>
          </header>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-600">
                Work Hours
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-950"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-950"
                />
              </div>
              <p className="text-[11px] text-slate-400">Mon – Fri (fixed for now)</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-600">
                Slot Duration
              </label>
              <div className="flex gap-3">
                {([30, 60] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSlotDuration(d)}
                    className={`flex-1 rounded-2xl border py-3 text-sm font-bold transition ${
                      slotDuration === d
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {d} minutes
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="h-12 w-full rounded-full bg-slate-950 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              {settingsSaved ? "✓ Saved!" : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* Bookings list */}
      {activeTab !== "settings" && (
        <>
          {bookings === undefined ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : displayedBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-200 bg-white p-16 text-center">
              <CalendarDays className="h-12 w-12 text-slate-200 mb-4" />
              <h3 className="font-bold text-slate-950">
                {activeTab === "pending" ? "No Pending Requests" : "No Bookings Yet"}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {activeTab === "pending"
                  ? "You're all caught up."
                  : "Students haven't booked with you yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {displayedBookings.map((booking) => {
                const cfg = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG];
                const isLoading = loadingId === booking._id;
                const isPending = booking.status === "pending";

                return (
                  <article
                    key={booking._id}
                    className={`rounded-3xl border bg-white p-7 shadow-sm ${
                      isPending ? "border-amber-200" : "border-slate-200"
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                            {(booking.student?.fullName ?? booking.student?.email ?? "?")[0].toUpperCase()}
                          </div>
                          <h3 className="font-bold text-slate-950 text-lg">
                            {booking.student?.fullName ?? booking.student?.email}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-2">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {format(booking.startTime, "EEE, d MMM yyyy")}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {format(booking.startTime, "HH:mm")} – {format(booking.endTime, "HH:mm")}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {booking.meetingType === "online" ? (
                              <><Video className="h-3.5 w-3.5" /> Online</>
                            ) : (
                              <><MapPin className="h-3.5 w-3.5" /> In-Person</>
                            )}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${cfg.classes}`}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Student notes */}
                    {booking.studentNotes && (
                      <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                          Student Notes
                        </p>
                        <p className="text-sm text-slate-600 italic">
                          &ldquo;{booking.studentNotes}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Reschedule proposed info */}
                    {booking.status === "reschedule_proposed" && booking.proposedStartTime && (
                      <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-violet-600 mb-1">
                          Your Proposal — Awaiting Student Response
                        </p>
                        <p className="text-sm text-slate-700">
                          {format(booking.proposedStartTime, "EEE, d MMM yyyy · HH:mm")} –{" "}
                          {format(booking.proposedEndTime!, "HH:mm")}
                        </p>
                        {booking.rescheduleNote && (
                          <p className="mt-1 text-xs text-slate-500 italic">
                            &ldquo;{booking.rescheduleNote}&rdquo;
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions for pending only */}
                    {isPending && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => act(booking._id, () => acceptBooking({ bookingId: booking._id }))}
                          disabled={isLoading}
                          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {isLoading ? "…" : "Accept"}
                        </button>
                        <button
                          onClick={() => setRescheduleTarget(booking._id)}
                          disabled={isLoading}
                          className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Propose New Time
                        </button>
                        <button
                          onClick={() => setRejectTarget(booking._id)}
                          disabled={isLoading}
                          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Decline
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-6">
          <div className="w-full max-w-md rounded-4xl border border-slate-200 bg-white p-8 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-slate-950">Decline Booking</h3>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-600">
                Reason (optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Let the student know why…"
                rows={3}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
              >
                Decline Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-6">
          <div className="w-full max-w-md rounded-4xl border border-slate-200 bg-white p-8 shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-950">Propose New Time</h3>
              <p className="mt-1 text-sm text-slate-500">
                The student will be asked to accept or decline your proposal.
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-600">
                  New Start Time
                </label>
                <input
                  type="datetime-local"
                  value={proposedStart}
                  onChange={(e) => setProposedStart(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-600">
                  New End Time
                </label>
                <input
                  type="datetime-local"
                  value={proposedEnd}
                  onChange={(e) => setProposedEnd(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-600">
                  Note to Student (optional)
                </label>
                <textarea
                  value={rescheduleNote}
                  onChange={(e) => setRescheduleNote(e.target.value)}
                  placeholder="Explain the change…"
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRescheduleTarget(null);
                  setProposedStart("");
                  setProposedEnd("");
                  setRescheduleNote("");
                }}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePropose}
                disabled={!proposedStart || !proposedEnd}
                className="flex-1 rounded-2xl bg-violet-700 py-3 text-sm font-bold text-white transition hover:bg-violet-800 disabled:opacity-50"
              >
                Send Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

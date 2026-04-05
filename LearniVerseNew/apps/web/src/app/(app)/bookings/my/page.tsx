"use client";

import { useState } from "react";
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
  Plus,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  accepted: {
    label: "Confirmed",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rejected: {
    label: "Declined",
    classes: "bg-rose-50 text-rose-700 border-rose-200",
    icon: <XCircle className="h-3 w-3" />,
  },
  reschedule_proposed: {
    label: "Reschedule Proposed",
    classes: "bg-violet-50 text-violet-700 border-violet-200",
    icon: <RefreshCw className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    classes: "bg-slate-100 text-slate-600 border-slate-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-slate-50 text-slate-400 border-slate-200",
    icon: <XCircle className="h-3 w-3" />,
  },
} as const;

export default function MyBookingsPage() {
  const currentUser = useQuery(api.users.current);
  const bookings = useQuery(api.teacherBookings.listMyBookings);
  const incoming = useQuery(api.teacherBookings.listIncomingRequests);
  const acceptBooking = useMutation(api.teacherBookings.acceptBooking);
  const rejectBooking = useMutation(api.teacherBookings.rejectBooking);
  const acceptReschedule = useMutation(api.teacherBookings.acceptReschedule);
  const declineReschedule = useMutation(api.teacherBookings.declineReschedule);
  const cancelBooking = useMutation(api.teacherBookings.cancelBooking);

  const [tab, setTab] = useState<"sent" | "received">("sent");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<Id<"teacherBookings"> | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isTeacher = currentUser?.role === "teacher";
  // Students and parents see both tabs; teachers only see "sent" (they manage incoming from /bookings/requests)
  const showReceivedTab = !isTeacher;

  const pendingIncoming = (incoming ?? []).filter(
    (b) => b.status === "pending" || b.status === "reschedule_proposed",
  );

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
    if (!rejectModalId) return;
    await act(rejectModalId, () =>
      rejectBooking({ bookingId: rejectModalId, reason: rejectReason.trim() || undefined }),
    );
    setRejectModalId(null);
    setRejectReason("");
  }

  const activeSent = (bookings ?? []).filter(
    (b) => b.status !== "completed" && b.status !== "cancelled",
  );
  const pastSent = (bookings ?? []).filter(
    (b) => b.status === "completed" || b.status === "cancelled",
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-14 sm:px-10">
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-700">
            My Schedule
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">
            My Bookings
          </h1>
        </div>
        <Link
          href="/bookings/teachers"
          className="flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </Link>
      </header>

      {/* Tabs — only for students / parents */}
      {showReceivedTab && (
        <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setTab("sent")}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
              tab === "sent"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Sent
            {(bookings?.length ?? 0) > 0 && (
              <span className="ml-2 text-xs text-slate-400">
                {bookings?.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("received")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
              tab === "received"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Received
            {pendingIncoming.length > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">
                {pendingIncoming.length}
              </span>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── SENT TAB ── */}
      {tab === "sent" && (
        <>
          {bookings === undefined ? (
            <LoadingSkeleton />
          ) : bookings.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-12 w-12 text-slate-200" />}
              title="No bookings yet"
              body="Schedule a meeting with one of your teachers."
              action={
                <Link
                  href="/bookings/teachers"
                  className="rounded-full bg-slate-950 px-8 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Book a Meeting
                </Link>
              }
            />
          ) : (
            <div className="space-y-10">
              {activeSent.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-950">
                    Upcoming & Active
                  </h2>
                  <div className="space-y-4">
                    {activeSent.map((booking) => (
                      <SentCard
                        key={booking._id}
                        booking={booking}
                        loadingId={loadingId}
                        onAcceptReschedule={() =>
                          act(booking._id, () =>
                            acceptReschedule({ bookingId: booking._id }),
                          )
                        }
                        onDeclineReschedule={() =>
                          act(booking._id, () =>
                            declineReschedule({ bookingId: booking._id }),
                          )
                        }
                        onCancel={() =>
                          act(booking._id, () =>
                            cancelBooking({ bookingId: booking._id }),
                          )
                        }
                      />
                    ))}
                  </div>
                </section>
              )}
              {pastSent.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-500">
                    Past Bookings
                  </h2>
                  <div className="space-y-3">
                    {pastSent.map((booking) => (
                      <PastCard
                        key={booking._id}
                        booking={booking}
                        nameField="teacher"
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* ── RECEIVED TAB ── */}
      {tab === "received" && showReceivedTab && (
        <>
          {incoming === undefined ? (
            <LoadingSkeleton />
          ) : incoming.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-12 w-12 text-slate-200" />}
              title="No incoming requests"
              body="When a teacher sends you a meeting request it will appear here."
            />
          ) : (
            <div className="space-y-4">
              {incoming.map((booking) => {
                const cfg =
                  STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG];
                const isLoading = loadingId === booking._id;
                const teacherName =
                  booking.teacher?.fullName ?? booking.teacher?.email;

                return (
                  <article
                    key={booking._id}
                    className={`rounded-3xl border bg-white p-7 shadow-sm transition ${
                      booking.status === "reschedule_proposed"
                        ? "border-violet-200 ring-2 ring-violet-100"
                        : booking.status === "pending"
                        ? "border-amber-200 ring-2 ring-amber-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                      <div>
                        <h3 className="font-bold text-slate-950 text-lg">
                          Meeting request from {teacherName}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {format(booking.startTime, "EEE, d MMM yyyy")}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {format(booking.startTime, "HH:mm")} –{" "}
                            {format(booking.endTime, "HH:mm")}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {booking.meetingType === "online" ? (
                              <>
                                <Video className="h-3.5 w-3.5" /> Online
                              </>
                            ) : (
                              <>
                                <MapPin className="h-3.5 w-3.5" /> In-Person
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${cfg.classes}`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </div>

                    {/* Notes from teacher */}
                    {booking.studentNotes && (
                      <p className="mb-4 text-sm italic text-slate-500">
                        &ldquo;{booking.studentNotes}&rdquo;
                      </p>
                    )}

                    {/* Meeting link once accepted */}
                    {booking.status === "accepted" && booking.meetingLink && (
                      <a
                        href={booking.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Video className="h-4 w-4" />
                        Join Meeting
                      </a>
                    )}

                    {/* Reschedule proposal */}
                    {booking.status === "reschedule_proposed" &&
                      booking.proposedStartTime && (
                        <div className="mb-4 space-y-2 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-violet-700">
                            New Time Proposed
                          </p>
                          <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                            <CalendarDays className="h-4 w-4 text-violet-500" />
                            {format(booking.proposedStartTime, "EEE, d MMM yyyy")}
                            <Clock className="ml-2 h-4 w-4 text-violet-500" />
                            {format(booking.proposedStartTime, "HH:mm")} –{" "}
                            {format(booking.proposedEndTime!, "HH:mm")}
                          </div>
                          {booking.rescheduleNote && (
                            <p className="text-xs italic text-slate-500">
                              &ldquo;{booking.rescheduleNote}&rdquo;
                            </p>
                          )}
                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={() =>
                                act(booking._id, () =>
                                  acceptReschedule({ bookingId: booking._id }),
                                )
                              }
                              disabled={isLoading}
                              className="flex-1 rounded-xl bg-violet-700 py-2.5 text-sm font-bold text-white transition hover:bg-violet-800 disabled:opacity-50"
                            >
                              {isLoading ? "…" : "Accept New Time"}
                            </button>
                            <button
                              onClick={() =>
                                act(booking._id, () =>
                                  declineReschedule({ bookingId: booking._id }),
                                )
                              }
                              disabled={isLoading}
                              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              {isLoading ? "…" : "Decline"}
                            </button>
                          </div>
                        </div>
                      )}

                    {/* Accept / Reject for pending teacher-initiated */}
                    {booking.status === "pending" && (
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            act(booking._id, () =>
                              acceptBooking({ bookingId: booking._id }),
                            )
                          }
                          disabled={isLoading}
                          className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isLoading ? "…" : "Accept"}
                        </button>
                        <button
                          onClick={() => setRejectModalId(booking._id)}
                          disabled={isLoading}
                          className="flex-1 rounded-xl border border-rose-200 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                        >
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
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-950">Decline Request</h3>
            <p className="mt-1 text-sm text-slate-500">
              Optionally share a reason with the teacher.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)…"
              rows={3}
              className="mt-4 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
            />
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleReject}
                disabled={!!loadingId}
                className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {loadingId ? "…" : "Decline"}
              </button>
              <button
                onClick={() => {
                  setRejectModalId(null);
                  setRejectReason("");
                }}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function SentCard({
  booking,
  loadingId,
  onAcceptReschedule,
  onDeclineReschedule,
  onCancel,
}: {
  booking: any;
  loadingId: string | null;
  onAcceptReschedule: () => void;
  onDeclineReschedule: () => void;
  onCancel: () => void;
}) {
  const cfg = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG];
  const isLoading = loadingId === booking._id;
  const otherName =
    booking.teacher?.fullName ?? booking.teacher?.email ?? "Unknown";

  return (
    <article
      className={`rounded-3xl border bg-white p-7 shadow-sm transition ${
        booking.status === "reschedule_proposed"
          ? "border-violet-200 ring-2 ring-violet-100"
          : "border-slate-200"
      }`}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-950">
            Meeting with {otherName}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {format(booking.startTime, "EEE, d MMM yyyy")}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {format(booking.startTime, "HH:mm")} –{" "}
              {format(booking.endTime, "HH:mm")}
            </span>
            <span className="flex items-center gap-1.5">
              {booking.meetingType === "online" ? (
                <>
                  <Video className="h-3.5 w-3.5" /> Online
                </>
              ) : (
                <>
                  <MapPin className="h-3.5 w-3.5" /> In-Person
                </>
              )}
            </span>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${cfg.classes}`}
        >
          {cfg.icon}
          {cfg.label}
        </span>
      </div>

      {booking.status === "accepted" && booking.meetingLink && (
        <a
          href={booking.meetingLink}
          target="_blank"
          rel="noreferrer"
          className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
        >
          <Video className="h-4 w-4" />
          Join Meeting
        </a>
      )}

      {booking.studentNotes && (
        <p className="mb-4 text-sm italic text-slate-500">
          &ldquo;{booking.studentNotes}&rdquo;
        </p>
      )}

      {booking.status === "rejected" && booking.rejectionReason && (
        <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <strong>Reason:</strong> {booking.rejectionReason}
        </p>
      )}

      {booking.status === "reschedule_proposed" && booking.proposedStartTime && (
        <div className="mb-4 space-y-2 rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-700">
            New Time Proposed
          </p>
          <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <CalendarDays className="h-4 w-4 text-violet-500" />
            {format(booking.proposedStartTime, "EEE, d MMM yyyy")}
            <Clock className="ml-2 h-4 w-4 text-violet-500" />
            {format(booking.proposedStartTime, "HH:mm")} –{" "}
            {format(booking.proposedEndTime!, "HH:mm")}
          </div>
          {booking.rescheduleNote && (
            <p className="text-xs italic text-slate-500">
              &ldquo;{booking.rescheduleNote}&rdquo;
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onAcceptReschedule}
              disabled={isLoading}
              className="flex-1 rounded-xl bg-violet-700 py-2.5 text-sm font-bold text-white transition hover:bg-violet-800 disabled:opacity-50"
            >
              {isLoading ? "…" : "Accept New Time"}
            </button>
            <button
              onClick={onDeclineReschedule}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {isLoading ? "…" : "Decline"}
            </button>
          </div>
        </div>
      )}

      {(booking.status === "pending" || booking.status === "accepted") && (
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="text-xs font-bold text-slate-400 transition hover:text-rose-600 disabled:opacity-50"
        >
          {isLoading ? "Cancelling…" : "Cancel Booking"}
        </button>
      )}
    </article>
  );
}

function PastCard({ booking, nameField }: { booking: any; nameField: string }) {
  const cfg = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG];
  const person = booking[nameField];
  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-600">
          {person?.fullName ?? person?.email}
        </p>
        <p className="text-xs text-slate-400">
          {format(booking.startTime, "EEE, d MMM yyyy · HH:mm")}
        </p>
      </div>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${cfg.classes}`}
      >
        {cfg.icon}
        {cfg.label}
      </span>
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-36 animate-pulse rounded-3xl bg-slate-100" />
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-200 bg-white p-20 text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="font-bold text-slate-950">{title}</h3>
      <p className="mb-6 mt-2 max-w-xs text-sm text-slate-500">{body}</p>
      {action}
    </div>
  );
}

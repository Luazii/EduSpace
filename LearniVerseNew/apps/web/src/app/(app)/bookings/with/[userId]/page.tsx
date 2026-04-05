"use client";

import { useState, useMemo, use } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  CalendarDays,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

type PageProps = { params: Promise<{ userId: string }> };

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildCalendarWeeks(anchor: Date): Date[][] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(1 - startOffset);

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  while (cursor.getMonth() === month || weeks.length < 1) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getMonth() !== month && weeks.length >= 4) break;
  }
  return weeks;
}

export default function TeacherScheduleWithUserPage({ params }: PageProps) {
  const { userId } = use(params);
  const typedUserId = userId as Id<"users">;

  // The current user (teacher) – needed to get their own availability settings
  const currentUser = useQuery(api.users.current);
  const targetUser = useQuery(api.users.getById, { userId: typedUserId });

  // Slots are always driven by the teacher's own schedule
  const teacherUserId = currentUser?._id as Id<"users"> | undefined;
  const settings = useQuery(
    api.teacherBookings.getTeacherSettings,
    teacherUserId ? { teacherUserId } : "skip",
  );

  const today = new Date();
  const [anchor, setAnchor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const calendarWeeks = useMemo(() => buildCalendarWeeks(anchor), [anchor]);

  const slots = useQuery(
    api.teacherBookings.getAvailableSlots,
    selectedDate && teacherUserId
      ? { teacherUserId, date: selectedDate }
      : "skip",
  );

  const [selectedSlot, setSelectedSlot] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  const [meetingType, setMeetingType] = useState<"in_person" | "online">(
    "online",
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBooking = useMutation(api.teacherBookings.createBooking);

  function prevMonth() {
    setAnchor((a) => new Date(a.getFullYear(), a.getMonth() - 1, 1));
    setSelectedDate(null);
    setSelectedSlot(null);
  }
  function nextMonth() {
    setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + 1, 1));
    setSelectedDate(null);
    setSelectedSlot(null);
  }

  function isWorkDay(d: Date): boolean {
    const workDays = settings?.workDays ?? [1, 2, 3, 4, 5];
    const isoDay = d.getDay() === 0 ? 7 : d.getDay();
    return workDays.includes(isoDay);
  }

  async function handleSubmit() {
    if (!selectedSlot) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createBooking({
        targetUserId: typedUserId,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        meetingType,
        studentNotes: notes.trim() || undefined,
      });
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">
            Request Sent!
          </h2>
          <p className="text-slate-500 max-w-sm">
            Your meeting request has been sent to{" "}
            {targetUser?.fullName ?? targetUser?.email ?? "them"}. They will be
            notified and can confirm or propose a new time.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/bookings/requests"
            className="rounded-full bg-slate-950 px-8 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            View My Requests
          </Link>
          <button
            onClick={() => {
              setSubmitted(false);
              setSelectedSlot(null);
              setSelectedDate(null);
              setNotes("");
            }}
            className="rounded-full border border-slate-200 px-8 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Send Another
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-14 sm:px-10">
      {/* Back + header */}
      <div className="space-y-4">
        <Link
          href="/bookings/with"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          All Students & Parents
        </Link>
        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-700">
            Request a Meeting
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
            {targetUser === undefined ? (
              <span className="inline-block h-10 w-60 animate-pulse rounded-xl bg-slate-100" />
            ) : (
              (targetUser?.fullName ?? targetUser?.email)
            )}
          </h1>
          {settings && (
            <p className="mt-2 text-sm text-slate-500">
              Your availability · {settings.workDayStart} – {settings.workDayEnd}{" "}
              · {settings.slotDurationMinutes}-minute slots
            </p>
          )}
        </header>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* ── Left: Calendar + Slots ── */}
        <div className="space-y-8">
          {/* Calendar */}
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={prevMonth}
                disabled={anchor <= new Date(today.getFullYear(), today.getMonth(), 1)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-base font-bold text-slate-950">
                {MONTHS[anchor.getMonth()]} {anchor.getFullYear()}
              </h2>
              <button
                onClick={nextMonth}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center">
              {WEEK_DAYS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                >
                  {d}
                </div>
              ))}
            </div>

            {calendarWeeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  const dateStr = toDateStr(day);
                  const isCurrentMonth = day.getMonth() === anchor.getMonth();
                  const isPast =
                    day < today && toDateStr(day) !== toDateStr(today);
                  const isToday = toDateStr(day) === toDateStr(today);
                  const isSelected = selectedDate === dateStr;
                  const isAvailable = isCurrentMonth && !isPast && isWorkDay(day);

                  return (
                    <button
                      key={di}
                      onClick={() => {
                        if (!isAvailable) return;
                        setSelectedDate(dateStr);
                        setSelectedSlot(null);
                      }}
                      disabled={!isAvailable}
                      className={`
                        relative flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition
                        ${!isCurrentMonth ? "text-slate-200" : ""}
                        ${isPast && isCurrentMonth ? "cursor-not-allowed text-slate-300" : ""}
                        ${isAvailable && !isSelected && !isToday ? "cursor-pointer text-slate-700 hover:bg-slate-100" : ""}
                        ${isToday && !isSelected ? "text-sky-700 ring-1 ring-inset ring-sky-300" : ""}
                        ${isSelected ? "bg-slate-950 text-white" : ""}
                      `}
                    >
                      {day.getDate()}
                      {isAvailable && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold text-slate-950">
                <Clock className="h-4 w-4 text-sky-600" />
                Available Slots —{" "}
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-ZA", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>

              {slots === undefined ? (
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-11 animate-pulse rounded-xl bg-slate-100"
                    />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  No available slots on this date.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => {
                    const label = new Date(slot.startTime).toLocaleTimeString(
                      "en-ZA",
                      { hour: "2-digit", minute: "2-digit", hour12: false },
                    );
                    const isChosen = selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                          isChosen
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-950 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Confirm form ── */}
        <aside className="sticky top-8 self-start">
          <div className="space-y-7 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <header>
              <h3 className="text-xl font-bold text-slate-950">
                Confirm Request
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Pick a slot and send a meeting request.
              </p>
            </header>

            {selectedSlot ? (
              <div className="space-y-1.5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                  <CalendarDays className="h-4 w-4 text-sky-600" />
                  {new Date(selectedSlot.startTime).toLocaleDateString("en-ZA", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {new Date(selectedSlot.startTime).toLocaleTimeString("en-ZA", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}{" "}
                  –{" "}
                  {new Date(selectedSlot.endTime).toLocaleTimeString("en-ZA", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}{" "}
                  ({settings?.slotDurationMinutes ?? 30} min)
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-400">
                Select a date and time slot from the calendar.
              </div>
            )}

            {/* Meeting type */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-600">
                Meeting Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMeetingType("online")}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-bold transition ${
                    meetingType === "online"
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  <Video className="h-5 w-5" />
                  Online
                </button>
                <button
                  onClick={() => setMeetingType("in_person")}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-bold transition ${
                    meetingType === "in_person"
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  <MapPin className="h-5 w-5" />
                  In-Person
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-600">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What would you like to discuss?"
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!selectedSlot || isSubmitting}
              className="h-14 w-full rounded-full bg-slate-950 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isSubmitting ? "Sending Request…" : "Send Meeting Request"}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  HelpCircle,
  Video,
  Users,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowRight,
} from "lucide-react";

type EventType = "assignment" | "quiz" | "live_session" | "meeting";

const TYPE_CONFIG: Record<EventType, { color: string; dot: string; icon: React.ElementType; label: string }> = {
  assignment: { color: "bg-amber-50 border-amber-200 text-amber-800", dot: "bg-amber-400", icon: ClipboardList, label: "Assignment" },
  quiz: { color: "bg-indigo-50 border-indigo-200 text-indigo-800", dot: "bg-indigo-500", icon: HelpCircle, label: "Quiz/Test" },
  live_session: { color: "bg-emerald-50 border-emerald-200 text-emerald-800", dot: "bg-emerald-500", icon: Video, label: "Live Class" },
  meeting: { color: "bg-sky-50 border-sky-200 text-sky-800", dot: "bg-sky-500", icon: Users, label: "Meeting" },
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"month" | "list">("month");

  const from = startOfMonth(subMonths(currentMonth, 1)).getTime();
  const to = endOfMonth(addMonths(currentMonth, 1)).getTime();

  const events = useQuery(api.calendar.getStudentCalendar, { fromDate: from, toDate: to }) ?? [];

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const e of events) {
      const key = format(new Date(e.date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const selectedEvents = selectedDate
    ? (eventsByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? [])
    : [];

  // Upcoming events list (next 30 days from today)
  const upcoming = useMemo(() => {
    const now = Date.now();
    const cutoff = now + 30 * 24 * 60 * 60 * 1000;
    return events.filter((e) => e.date >= now && e.date <= cutoff).slice(0, 20);
  }, [events]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Academic</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">My Calendar</h1>
          <p className="mt-2 text-sm text-slate-500">Assignments, quizzes, classes and meetings in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          {(["month", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${view === v ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {v === "month" ? "Month view" : "Upcoming"}
            </button>
          ))}
        </div>
      </header>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap gap-3">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <span key={type} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold ${cfg.color}`}>
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        ))}
      </div>

      {view === "month" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Calendar grid */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 transition">
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </button>
              <h2 className="text-base font-black text-slate-950">{format(currentMonth, "MMMM yyyy")}</h2>
              <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 transition">
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {monthDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate.get(key) ?? [];
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const today = isToday(day);

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(isSameDay(day, selectedDate ?? new Date(0)) ? null : day)}
                    className={`min-h-[72px] border-b border-r border-slate-100 p-2 text-left transition last:border-r-0 hover:bg-slate-50 ${isSelected ? "bg-slate-950 hover:bg-slate-800" : ""}`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      today && !isSelected ? "bg-sky-600 text-white" : isSelected ? "text-white" : isCurrentMonth ? "text-slate-900" : "text-slate-300"
                    }`}>
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {dayEvents.slice(0, 2).map((e) => {
                        const cfg = TYPE_CONFIG[e.type as EventType];
                        return (
                          <span key={e.id} className={`truncate rounded px-1 py-0.5 text-[9px] font-bold ${isSelected ? "bg-white/20 text-white" : cfg.color}`}>
                            {e.title}
                          </span>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <span className={`text-[9px] font-bold ${isSelected ? "text-white/60" : "text-slate-400"}`}>+{dayEvents.length - 2} more</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day detail panel */}
          <div className="space-y-4">
            {selectedDate ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-black text-slate-950">
                  {format(selectedDate, "EEEE, d MMMM yyyy")}
                </h3>
                {selectedEvents.length === 0 ? (
                  <p className="text-xs text-slate-400">Nothing scheduled on this day.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((e) => <EventCard key={e.id} event={e} />)}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-xs font-bold text-slate-400">Click a day to see details</p>
              </div>
            )}

            {/* Upcoming mini-list */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Next 30 days</h3>
              {upcoming.length === 0 ? (
                <p className="text-xs text-slate-400">No upcoming events.</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.slice(0, 6).map((e) => {
                    const cfg = TYPE_CONFIG[e.type as EventType];
                    const Row = (
                      <>
                        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900">{e.title}</p>
                          <p className="text-[10px] text-slate-400">{format(new Date(e.date), "d MMM · HH:mm")}{e.courseCode ? ` · ${e.courseCode}` : ""}</p>
                        </div>
                      </>
                    );
                    return e.href ? (
                      <Link key={e.id} href={e.href} className="flex items-start gap-3 rounded-xl px-1 py-0.5 transition hover:bg-slate-50">
                        {Row}
                      </Link>
                    ) : (
                      <div key={e.id} className="flex items-start gap-3">
                        {Row}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Upcoming list view */
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
              <Calendar className="mb-4 h-12 w-12 text-slate-300" />
              <p className="font-bold text-slate-600">No upcoming events in the next 30 days</p>
            </div>
          ) : (
            upcoming.map((e) => <EventCard key={e.id} event={e} large />)
          )}
        </div>
      )}
    </main>
  );
}

function EventCard({ event, large }: { event: { id: string; type: string; title: string; courseCode?: string; courseName?: string; date: number; endDate?: number; detail?: string; status?: string; href?: string }; large?: boolean }) {
  const cfg = TYPE_CONFIG[event.type as EventType] ?? TYPE_CONFIG.assignment;
  const Icon = cfg.icon;
  const inner = (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={`font-bold ${large ? "text-sm" : "text-xs"} text-slate-900`}>{event.title}</p>
        {event.courseCode && (
          <p className="text-[10px] font-bold opacity-70">{event.courseCode}{event.courseName ? ` · ${event.courseName}` : ""}</p>
        )}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-medium opacity-70">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(event.date), large ? "EEEE d MMM, HH:mm" : "HH:mm")}</span>
          {event.endDate && <span>– {format(new Date(event.endDate), "HH:mm")}</span>}
          {event.detail && <span>{event.detail}</span>}
        </div>
      </div>
      {event.href && <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" />}
    </div>
  );

  if (event.href) {
    return (
      <Link href={event.href} className={`block rounded-2xl border px-4 py-3 transition hover:shadow-md ${cfg.color}`}>
        {inner}
      </Link>
    );
  }
  return <div className={`rounded-2xl border px-4 py-3 ${cfg.color}`}>{inner}</div>;
}

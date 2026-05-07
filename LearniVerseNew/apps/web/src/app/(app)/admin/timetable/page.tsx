"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { Clock, MapPin, Monitor, Plus, Trash2, CalendarDays, CheckCircle2 } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DAY_NUMBERS = [1, 2, 3, 4, 5];

const PERIODS = [
  { label: "P1 · 07:30", startHour: 7, startMinute: 30 },
  { label: "P2 · 08:30", startHour: 8, startMinute: 30 },
  { label: "P3 · 09:30", startHour: 9, startMinute: 30 },
  { label: "P4 · 11:00", startHour: 11, startMinute: 0 },
  { label: "P5 · 12:00", startHour: 12, startMinute: 0 },
  { label: "P6 · 13:40", startHour: 13, startMinute: 40 },
  { label: "P7 · 14:40", startHour: 14, startMinute: 40 },
];

type SlotForm = {
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  durationMinutes: string;
  deliveryMode: "online" | "in_person";
  venue: string;
  meetingUrl: string;
};

const EMPTY_FORM: SlotForm = {
  dayOfWeek: 1,
  startHour: 7,
  startMinute: 30,
  durationMinutes: "50",
  deliveryMode: "in_person",
  venue: "",
  meetingUrl: "",
};

export default function AdminTimetablePage() {
  const allSlots = useQuery(api.timetable.listAll) ?? [];
  const courses = useQuery(api.reports.listCourses) ?? [];
  const upsertSlot = useMutation(api.timetable.upsertSlot);
  const deleteSlot = useMutation(api.timetable.deleteSlot);
  const seedTimetable = useMutation(api.timetable.seedTimetable);

  const [selectedCourseId, setSelectedCourseId] = useState<Id<"courses"> | null>(null);
  const [form, setForm] = useState<SlotForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<Id<"timetable"> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  const courseSlots = allSlots.filter((s) =>
    selectedCourseId ? s.courseId === selectedCourseId : true,
  );

  // Build grid: day → period key → slot
  const grid: Record<string, Record<string, typeof allSlots[0] | undefined>> = {};
  for (const slot of courseSlots) {
    const dayKey = String(slot.dayOfWeek);
    const timeKey = `${slot.startHour}:${String(slot.startMinute).padStart(2, "0")}`;
    if (!grid[dayKey]) grid[dayKey] = {};
    grid[dayKey][timeKey] = slot;
  }

  function openNew(dayOfWeek: number, startHour: number, startMinute: number) {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, dayOfWeek, startHour, startMinute });
    setShowForm(true);
  }

  function openEdit(slot: typeof allSlots[0]) {
    setEditingId(slot._id);
    setForm({
      dayOfWeek: slot.dayOfWeek,
      startHour: slot.startHour,
      startMinute: slot.startMinute,
      durationMinutes: String(slot.durationMinutes),
      deliveryMode: slot.deliveryMode,
      venue: slot.venue ?? "",
      meetingUrl: slot.meetingUrl ?? "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!selectedCourseId) return;
    setSaving(true);
    try {
      await upsertSlot({
        slotId: editingId ?? undefined,
        courseId: selectedCourseId,
        dayOfWeek: form.dayOfWeek,
        startHour: form.startHour,
        startMinute: form.startMinute,
        durationMinutes: Number(form.durationMinutes) || 50,
        deliveryMode: form.deliveryMode,
        venue: form.venue.trim() || undefined,
        meetingUrl: form.meetingUrl.trim() || undefined,
      });
      setShowForm(false);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedTimetable({});
      setSeedDone(true);
      setTimeout(() => setSeedDone(false), 3000);
    } finally {
      setSeeding(false);
    }
  }

  const fmt = (h: number, m: number) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-8">
        <nav className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
          <span>Admin</span><span>/</span><span className="text-slate-900">Timetable</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">Class Timetable</h1>
            <p className="mt-2 text-sm text-slate-500">Manage weekly recurring class schedules for all subjects.</p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            {seedDone ? <CheckCircle2 className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
            {seeding ? "Seeding…" : seedDone ? "Done!" : "Auto-seed all grades"}
          </button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Course selector */}
        <aside className="space-y-2">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Subjects</p>
          <button
            onClick={() => setSelectedCourseId(null)}
            className={`w-full rounded-2xl border px-4 py-2.5 text-left text-sm font-bold transition ${!selectedCourseId ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            All subjects
          </button>
          {courses.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedCourseId(c._id)}
              className={`w-full rounded-2xl border px-4 py-2.5 text-left text-sm transition ${selectedCourseId === c._id ? "border-sky-500 bg-sky-50 font-bold text-sky-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              <span className="font-bold">{c.courseCode}</span>
              <span className="block text-xs text-slate-400 truncate">{c.courseName}</span>
            </button>
          ))}
        </aside>

        {/* Timetable grid */}
        <div>
          {/* Add slot button */}
          {selectedCourseId && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => openNew(1, 7, 30)}
                className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" /> Add slot
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* Header row */}
            <div className="grid grid-cols-6 border-b border-slate-100">
              <div className="border-r border-slate-100 px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Period</span>
              </div>
              {DAYS.map((day) => (
                <div key={day} className="border-r border-slate-100 px-4 py-3 last:border-r-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{day}</span>
                </div>
              ))}
            </div>

            {/* Period rows */}
            {PERIODS.map((period) => {
              const timeKey = `${period.startHour}:${String(period.startMinute).padStart(2, "0")}`;
              return (
                <div key={timeKey} className="grid grid-cols-6 border-b border-slate-100 last:border-b-0">
                  {/* Time label */}
                  <div className="border-r border-slate-100 px-4 py-3">
                    <span className="text-xs font-bold text-slate-500">{period.label}</span>
                  </div>
                  {/* Day cells */}
                  {DAY_NUMBERS.map((dayNum) => {
                    const slot = grid[String(dayNum)]?.[timeKey];
                    return (
                      <div key={dayNum} className="min-h-[72px] border-r border-slate-100 p-2 last:border-r-0">
                        {slot ? (
                          <div
                            className={`group relative h-full rounded-xl p-2 text-[10px] font-bold cursor-pointer transition hover:opacity-90 ${
                              slot.deliveryMode === "online"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                            onClick={() => openEdit(slot)}
                          >
                            <p className="font-black truncate">{slot.courseCode}</p>
                            <div className="mt-0.5 flex items-center gap-1">
                              {slot.deliveryMode === "online" ? (
                                <Monitor className="h-2.5 w-2.5" />
                              ) : (
                                <MapPin className="h-2.5 w-2.5" />
                              )}
                              <span className="truncate">{slot.deliveryMode === "online" ? "Online" : (slot.venue ?? "In-Person")}</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); void deleteSlot({ slotId: slot._id }); }}
                              className="absolute right-1 top-1 hidden rounded p-0.5 hover:bg-black/10 group-hover:flex"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ) : selectedCourseId ? (
                          <button
                            onClick={() => openNew(dayNum, period.startHour, period.startMinute)}
                            className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-100 text-slate-200 transition hover:border-slate-300 hover:text-slate-400"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-sky-200" /><Monitor className="h-3 w-3" /> Online</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-200" /><MapPin className="h-3 w-3" /> In-Person</span>
            <span className="text-slate-400">Click a cell to edit · hover slot for delete</span>
          </div>
        </div>
      </div>

      {/* Slot form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <h2 className="mb-6 text-lg font-black text-slate-950">
              {editingId ? "Edit Class Slot" : "Add Class Slot"}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Day</label>
                  <select
                    value={form.dayOfWeek}
                    onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                  >
                    {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Period / Start time</label>
                  <select
                    value={`${form.startHour}:${form.startMinute}`}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":").map(Number);
                      setForm((f) => ({ ...f, startHour: h, startMinute: m }));
                    }}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                  >
                    {PERIODS.map((p) => (
                      <option key={p.label} value={`${p.startHour}:${p.startMinute}`}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Duration (minutes)</label>
                <input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Delivery mode</label>
                <div className="flex gap-3">
                  {(["in_person", "online"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, deliveryMode: mode }))}
                      className={`flex-1 rounded-2xl border py-2.5 text-sm font-bold transition ${form.deliveryMode === mode ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                    >
                      {mode === "in_person" ? "In-Person" : "Online"}
                    </button>
                  ))}
                </div>
              </div>

              {form.deliveryMode === "in_person" ? (
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Venue / Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Maths Room 101"
                    value={form.venue}
                    onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Meeting URL</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={form.meetingUrl}
                    onChange={(e) => setForm((f) => ({ ...f, meetingUrl: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving || !selectedCourseId}
                className="flex-1 rounded-2xl bg-slate-950 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

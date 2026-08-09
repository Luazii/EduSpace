"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { Trophy, Users, MapPin, Clock, User, Plus, CheckCircle2 } from "lucide-react";

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatSchedule(days: string[], time: string) {
  if (days.length === 0) return undefined;
  const ordered = DAY_OPTIONS.filter((d) => days.includes(d));
  const dayPart =
    ordered.length <= 1
      ? ordered.join("")
      : ordered.length === 2
      ? ordered.join(" & ")
      : `${ordered.slice(0, -1).join(", ")} & ${ordered[ordered.length - 1]}`;
  return time ? `${dayPart} ${time}` : dayPart;
}

export default function AdminSportsPage() {
  const sports = useQuery(api.sports.listAll);
  const venues = useQuery(api.sportsVenues.listVenues, { includeInactive: true });
  const allUsers = useQuery(api.users.list);
  const createSport = useMutation(api.sports.create);
  const updateSport = useMutation(api.sports.update);
  const createVenue = useMutation(api.sportsVenues.createVenue);

  const coaches = (allUsers ?? []).filter((u) => u.role === "coach");
  const coachLabel = (u: (typeof coaches)[number]) => u.fullName ?? [u.firstName, u.lastName].filter(Boolean).join(" ") ?? u.email;

  const [form, setForm] = useState({ name: "", category: "", description: "", coachName: "", venue: "", maxCapacity: "" });
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleDay = (day: string) => {
    setScheduleDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const [showVenueForm, setShowVenueForm] = useState(false);
  const [venueForm, setVenueForm] = useState({ name: "", location: "", capacity: "" });
  const [venueSaving, setVenueSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createSport({
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
        coachName: form.coachName || undefined,
        venue: form.venue || undefined,
        schedule: formatSchedule(scheduleDays, scheduleTime),
        maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : undefined,
      });
      setForm({ name: "", category: "", description: "", coachName: "", venue: "", maxCapacity: "" });
      setScheduleDays([]);
      setScheduleTime("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueForm.name.trim()) return;
    setVenueSaving(true);
    try {
      await createVenue({
        name: venueForm.name.trim(),
        location: venueForm.location.trim() || undefined,
        capacity: venueForm.capacity ? Number(venueForm.capacity) : undefined,
      });
      setForm((p) => ({ ...p, venue: venueForm.name.trim() }));
      setVenueForm({ name: "", location: "", capacity: "" });
      setShowVenueForm(false);
    } finally {
      setVenueSaving(false);
    }
  };

  const toggleActive = async (id: Id<"sports">, current: boolean) => {
    await updateSport({ sportId: id, isActive: !current });
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-8">
        <nav className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
          <span>Admin</span><span>/</span><span className="text-slate-900">Sports Management</span>
        </nav>
        <h1 className="text-4xl font-black tracking-tight text-slate-950">Sports Management</h1>
        <p className="mt-2 text-sm text-slate-500">Create and manage sports available to students.</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
        {/* Create form */}
        <aside>
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="mb-5 text-base font-black text-slate-950 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Sport
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { key: "name", label: "Sport name *", placeholder: "e.g. Football" },
                { key: "category", label: "Category", placeholder: "e.g. Team Sport" },
                { key: "maxCapacity", label: "Max capacity", placeholder: "Leave blank for unlimited" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-bold text-slate-600">{f.label}</label>
                  <input
                    type={f.key === "maxCapacity" ? "number" : "text"}
                    value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
                  />
                </div>
              ))}

              {/* Coach — chosen from existing coach accounts, not typed */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Coach</label>
                <select
                  value={form.coachName}
                  onChange={(e) => setForm((prev) => ({ ...prev, coachName: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
                >
                  <option value="">Unassigned</option>
                  {coaches.map((c) => (
                    <option key={c._id} value={coachLabel(c)}>{coachLabel(c)}</option>
                  ))}
                </select>
                {coaches.length === 0 && (
                  <p className="mt-1 text-[10px] text-slate-400">No coach accounts exist yet — create one under Admin → Users.</p>
                )}
              </div>

              {/* Schedule — day-of-week picker + time selector, not typed */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Schedule</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {DAY_OPTIONS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black transition ${
                        scheduleDays.includes(day)
                          ? "bg-sky-600 text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
                />
                {(scheduleDays.length > 0 || scheduleTime) && (
                  <p className="mt-1 text-[10px] font-bold text-sky-700">{formatSchedule(scheduleDays, scheduleTime) ?? "Pick a day"}</p>
                )}
              </div>

              {/* Venue — chosen from existing registered venues, not typed */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-600">Venue</label>
                  <button type="button" onClick={() => setShowVenueForm((v) => !v)} className="text-[10px] font-bold text-sky-600 hover:text-sky-800">
                    {showVenueForm ? "Cancel" : "+ New venue"}
                  </button>
                </div>
                {showVenueForm ? (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <input type="text" value={venueForm.name} onChange={(e) => setVenueForm((p) => ({ ...p, name: e.target.value }))} placeholder="Venue name *" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none" />
                    <input type="text" value={venueForm.location} onChange={(e) => setVenueForm((p) => ({ ...p, location: e.target.value }))} placeholder="Location (optional)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none" />
                    <input type="number" value={venueForm.capacity} onChange={(e) => setVenueForm((p) => ({ ...p, capacity: e.target.value }))} placeholder="Capacity (optional)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none" />
                    <button type="button" onClick={handleCreateVenue} disabled={venueSaving || !venueForm.name.trim()} className="w-full rounded-xl bg-sky-600 py-2 text-[10px] font-black text-white hover:bg-sky-700 disabled:opacity-50">
                      {venueSaving ? "Adding…" : "Add venue"}
                    </button>
                  </div>
                ) : (
                  <>
                    <select
                      value={form.venue}
                      onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
                    >
                      <option value="">No venue</option>
                      {(venues ?? []).map((v) => (
                        <option key={v._id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                    {(venues ?? []).length === 0 && (
                      <p className="mt-1 text-[10px] text-slate-400">No venues registered yet — use "+ New venue" to add one.</p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Brief description…"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="w-full rounded-2xl bg-slate-950 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Creating…" : saved ? "✓ Created!" : "Create sport"}
              </button>
            </form>
          </div>
        </aside>

        {/* Sports list */}
        <div>
          {sports === undefined ? (
            <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" /></div>
          ) : sports.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
              <Trophy className="mb-4 h-12 w-12 text-slate-300" />
              <p className="font-bold text-slate-500">No sports yet. Add your first sport.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sports.map((sport) => (
                <div key={sport._id} className={`rounded-3xl border bg-white p-5 shadow-sm ${!sport.isActive ? "opacity-60" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-black text-slate-950">{sport.name}</h3>
                        {sport.category && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">{sport.category}</span>}
                        {!sport.isActive && <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">Inactive</span>}
                      </div>
                      {sport.description && <p className="text-xs text-slate-500 mb-2">{sport.description}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {sport.coachName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{sport.coachName}</span>}
                        {sport.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{sport.venue}</span>}
                        {sport.schedule && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{sport.schedule}</span>}
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{sport.enrolledCount} registered{sport.maxCapacity ? ` / ${sport.maxCapacity}` : ""}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(sport._id, sport.isActive)}
                      className={`shrink-0 rounded-2xl border px-3 py-1.5 text-[10px] font-black transition ${sport.isActive ? "border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}
                    >
                      {sport.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

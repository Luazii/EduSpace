"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { Trophy, Users, MapPin, Clock, User, Plus, CheckCircle2 } from "lucide-react";

export default function AdminSportsPage() {
  const sports = useQuery(api.sports.listAll);
  const createSport = useMutation(api.sports.create);
  const updateSport = useMutation(api.sports.update);

  const [form, setForm] = useState({ name: "", category: "", description: "", coachName: "", venue: "", schedule: "", maxCapacity: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createSport({
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
        coachName: form.coachName.trim() || undefined,
        venue: form.venue.trim() || undefined,
        schedule: form.schedule.trim() || undefined,
        maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : undefined,
      });
      setForm({ name: "", category: "", description: "", coachName: "", venue: "", schedule: "", maxCapacity: "" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
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
                { key: "coachName", label: "Coach", placeholder: "Coach full name" },
                { key: "venue", label: "Venue", placeholder: "e.g. Main field" },
                { key: "schedule", label: "Schedule", placeholder: "e.g. Tue & Thu 14:00" },
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

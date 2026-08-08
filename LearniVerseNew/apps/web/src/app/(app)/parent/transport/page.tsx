"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import {
  Bus, MapPin, Users, CheckCircle2, XCircle, Clock,
  Route, Navigation, Shield, ChevronDown
} from "lucide-react";
import { format } from "date-fns";

export default function ParentTransportPage() {
  const user = useQuery(api.users.current);
  const routes = useQuery(api.transport.listRoutes);
  const bookings = useQuery(api.transport.listMyBookings);
  const learners = useQuery(api.transport.listMyLearners);
  const requestBooking = useMutation(api.transport.requestBooking);

  const [showBookForm, setShowBookForm] = useState(false);
  const [form, setForm] = useState({ routeId: "", learnerId: "", pickupStopId: "", dropoffStopId: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [trackingRoute, setTrackingRoute] = useState<string | null>(null);

  if (user === undefined || routes === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (user?.role !== "parent") {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-14">
        <Shield className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-black text-slate-950">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-500">This portal is for parents only.</p>
      </main>
    );
  }

  const selectedRoute = routes.find((r) => r._id === form.routeId);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.routeId || !form.learnerId) return;
    setSaving(true);
    setMessage(null);
    try {
      await requestBooking({
        routeId: form.routeId as Id<"transportRoutes">,
        learnerUserId: form.learnerId as Id<"users">,
        pickupStopId: form.pickupStopId ? form.pickupStopId as Id<"transportRouteStops"> : undefined,
        dropoffStopId: form.dropoffStopId ? form.dropoffStopId as Id<"transportRouteStops"> : undefined,
        notes: form.notes.trim() || undefined,
      });
      setMessage({ text: "Booking request submitted! Awaiting admin approval.", ok: true });
      setForm({ routeId: "", learnerId: "", pickupStopId: "", dropoffStopId: "", notes: "" });
      setShowBookForm(false);
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Booking failed.", ok: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 sm:px-10">
      <header className="mb-8 border-b border-slate-100 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Parent Portal</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-950">School Transport</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-2xl">
          Book transport for your children, view booking statuses, and track bus locations in real-time.
        </p>
      </header>

      {message && (
        <div className={`mb-6 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {message.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Action bar */}
      <div className="mb-8 flex gap-3">
        <button onClick={() => setShowBookForm(!showBookForm)} className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700">
          <Bus className="h-3.5 w-3.5" /> Book Transport
        </button>
      </div>

      {/* Booking form (UC-11) */}
      {showBookForm && (
        <form onSubmit={handleBook} className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-black text-slate-950">Request Transport Booking</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Select Child *</label>
              <select value={form.learnerId} onChange={(e) => setForm(p => ({ ...p, learnerId: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                <option value="">Choose learner…</option>
                {(learners ?? []).filter(Boolean).map((l) => (
                  <option key={l!._id} value={l!._id}>{l!.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Select Route *</label>
              <select value={form.routeId} onChange={(e) => setForm(p => ({ ...p, routeId: e.target.value, pickupStopId: "", dropoffStopId: "" }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                <option value="">Choose route…</option>
                {routes.filter(r => r.isActive).map((r) => (
                  <option key={r._id} value={r._id}>{r.name} ({r.routeCode})</option>
                ))}
              </select>
            </div>
            {selectedRoute && selectedRoute.stops && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Pickup Stop</label>
                  <select value={form.pickupStopId} onChange={(e) => setForm(p => ({ ...p, pickupStopId: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                    <option value="">Select pickup…</option>
                    {selectedRoute.stops.map((s: any) => (
                      <option key={s._id} value={s._id}>{s.label} — {s.address}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Drop-off Stop</label>
                  <select value={form.dropoffStopId} onChange={(e) => setForm(p => ({ ...p, dropoffStopId: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                    <option value="">Select drop-off…</option>
                    {selectedRoute.stops.map((s: any) => (
                      <option key={s._id} value={s._id}>{s.label} — {s.address}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Any special requirements…" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving || !form.routeId || !form.learnerId} className="rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? "Submitting…" : "Submit Request"}
            </button>
            <button type="button" onClick={() => setShowBookForm(false)} className="rounded-2xl border border-slate-200 px-6 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      {/* My Bookings */}
      <section className="mb-10">
        <h2 className="text-xl font-black text-slate-950 flex items-center gap-2 mb-6">
          <Bus className="h-5 w-5 text-emerald-600" /> My Transport Bookings
        </h2>
        {(bookings ?? []).length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
            <Bus className="mb-4 h-12 w-12 text-slate-300" />
            <p className="font-bold text-slate-500">No bookings yet.</p>
            <p className="mt-1 text-sm text-slate-400">Use the button above to request transport for your child.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(bookings ?? []).map((b) => (
              <div key={b._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        b.status === "approved" ? "bg-emerald-50 text-emerald-600"
                        : b.status === "pending" ? "bg-amber-50 text-amber-600"
                        : b.status === "rejected" ? "bg-rose-50 text-rose-600"
                        : "bg-slate-50 text-slate-600"
                      }`}>{b.status.toUpperCase()}</span>
                      <h3 className="font-bold text-slate-950 text-sm">{b.learner?.fullName ?? "Learner"}</h3>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Route className="h-3 w-3" />{b.route?.name ?? "—"}</span>
                      {b.pickupStop && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Pickup: {b.pickupStop.label}</span>}
                      {b.dropoffStop && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Drop: {b.dropoffStop.label}</span>}
                    </div>
                  </div>
                  {b.status === "approved" && (
                    <button
                      onClick={() => setTrackingRoute(trackingRoute === b._id ? null : b._id)}
                      className="flex items-center gap-1.5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-[10px] font-bold text-sky-700 hover:bg-sky-100 transition"
                    >
                      <Navigation className="h-3 w-3" /> Track Bus
                    </button>
                  )}
                </div>

                {/* UC-14: Live Tracking simulation */}
                {trackingRoute === b._id && (
                  <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Navigation className="h-4 w-4 text-sky-600 animate-pulse" />
                      <span className="text-xs font-black text-slate-700">Live Bus Tracking</span>
                    </div>
                    {/* Simulated route progress */}
                    <div className="relative">
                      {(b.route as any)?.stops?.length ? (
                        <div className="space-y-0">
                          {((b.route as any).stops as any[]).map((stop: any, i: number, arr: any[]) => (
                            <div key={stop._id || i} className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`h-4 w-4 rounded-full border-2 ${i === 0 ? "bg-emerald-500 border-emerald-500" : i < Math.floor(arr.length * 0.6) ? "bg-sky-500 border-sky-500" : "bg-slate-200 border-slate-300"}`} />
                                {i < arr.length - 1 && <div className={`w-0.5 h-8 ${i < Math.floor(arr.length * 0.6) ? "bg-sky-300" : "bg-slate-200"}`} />}
                              </div>
                              <div className="pb-6">
                                <p className={`text-xs font-bold ${i < Math.floor(arr.length * 0.6) ? "text-slate-800" : "text-slate-400"}`}>{stop.label}</p>
                                <p className="text-[10px] text-slate-400">{stop.address}</p>
                                {i === Math.floor(arr.length * 0.6) && (
                                  <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                                    <Bus className="h-2.5 w-2.5" /> Bus is here • ETA next stop: ~5 min
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No stop information available for this route.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Available Routes (UC-14) */}
      <section>
        <h2 className="text-xl font-black text-slate-950 flex items-center gap-2 mb-6">
          <Route className="h-5 w-5 text-cyan-600" /> Available Routes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {routes.filter(r => r.isActive).map((route) => (
            <div key={route._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700">{route.routeCode}</span>
                <h3 className="font-bold text-slate-950 text-sm">{route.name}</h3>
              </div>
              {route.busLabel && <p className="text-[10px] text-slate-400 mb-2">🚌 {route.busLabel}</p>}
              {route.stops && route.stops.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {route.stops.map((s: any, i: number) => (
                    <span key={s._id || i} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{s.label}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

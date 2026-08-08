"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import Link from "next/link";
import {
  Bus, MapPin, Users, Plus, CheckCircle2, XCircle, Clock,
  Route, AlertTriangle, Bell, ChevronRight, Shield, Trash2
} from "lucide-react";
import { format } from "date-fns";

type Tab = "routes" | "bookings" | "incidents" | "notifications";

export default function AdminTransportPage() {
  const user = useQuery(api.users.current);
  const routes = useQuery(api.transport.listRoutes);
  const bookings = useQuery(api.transport.listMyBookings);
  const approveMut = useMutation(api.transport.approveBooking);
  const rejectMut = useMutation(api.transport.rejectBooking);

  const [tab, setTab] = useState<Tab>("routes");
  const [showCreateRoute, setShowCreateRoute] = useState(false);

  if (user === undefined || routes === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin" || user?.role === "transport_admin";
  if (!isAdmin) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-14">
        <Shield className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-black text-slate-950">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-500">This portal is for transport administrators and school admins only.</p>
      </main>
    );
  }

  const pendingBookings = (bookings ?? []).filter((b) => b.status === "pending");
  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: "routes", label: "Routes & Fleet", icon: Route },
    { key: "bookings", label: "Booking Requests", icon: Users, badge: pendingBookings.length },
    { key: "incidents", label: "Incidents", icon: AlertTriangle },
    { key: "notifications", label: "Notify Parents", icon: Bell },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 sm:px-10">
      <header className="mb-8 border-b border-slate-100 pb-8">
        <nav className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
          <Link href="/admin" className="hover:text-slate-700">Admin</Link><span>/</span><span className="text-slate-900">Transport Management</span>
        </nav>
        <div className="flex items-center gap-3 mb-4">
          <span className="rounded-full bg-cyan-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Transport Hub</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-950">Transport Management</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-2xl">
          Create bus routes, manage bookings, review incidents, and send notifications to parents.
        </p>
      </header>

      {/* Stats summary */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <StatCard label="Active Routes" value={routes.filter(r => r.isActive).length} color="text-cyan-600" />
        <StatCard label="Total Bookings" value={(bookings ?? []).length} color="text-sky-600" />
        <StatCard label="Pending Requests" value={pendingBookings.length} color="text-amber-600" />
        <StatCard label="Open Incidents" value={routes.reduce((sum, r) => sum + (r.recentIncidents?.filter((i: any) => i.status !== "resolved").length ?? 0), 0)} color="text-rose-600" />
      </div>

      {/* Tab navigation */}
      <div className="mb-8 flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${tab === key ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {badge ? <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "routes" && <RoutesTab routes={routes} showCreate={showCreateRoute} setShowCreate={setShowCreateRoute} />}
      {tab === "bookings" && <BookingsTab bookings={bookings ?? []} approveMut={approveMut} rejectMut={rejectMut} />}
      {tab === "incidents" && <IncidentsTab routes={routes} />}
      {tab === "notifications" && <NotificationsTab />}
    </main>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
    </div>
  );
}

/* ───────────────────────── UC-12: Routes Tab ───────────────────────── */

function RoutesTab({ routes, showCreate, setShowCreate }: { routes: any[]; showCreate: boolean; setShowCreate: (v: boolean) => void }) {
  const createRoute = useMutation(api.transport.createRoute);
  const [form, setForm] = useState({
    routeCode: "", name: "", description: "", serviceType: "school_run" as "school_run" | "event" | "special",
    capacity: "", busLabel: "", stops: [{ label: "", address: "", stopOrder: 1 }],
  });
  const [saving, setSaving] = useState(false);

  const addStop = () => setForm(p => ({ ...p, stops: [...p.stops, { label: "", address: "", stopOrder: p.stops.length + 1 }] }));
  const removeStop = (idx: number) => setForm(p => ({ ...p, stops: p.stops.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stopOrder: i + 1 })) }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createRoute({
        routeCode: form.routeCode.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        serviceType: form.serviceType,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        busLabel: form.busLabel.trim() || undefined,
        stops: form.stops.filter(s => s.label.trim() && s.address.trim()),
      });
      setForm({ routeCode: "", name: "", description: "", serviceType: "school_run", capacity: "", busLabel: "", stops: [{ label: "", address: "", stopOrder: 1 }] });
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
          <Route className="h-5 w-5 text-cyan-600" /> Bus Routes ({routes.length})
        </h2>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white transition hover:bg-slate-800">
          <Plus className="h-3.5 w-3.5" /> Create Route
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Route Code *</label>
              <input type="text" value={form.routeCode} onChange={(e) => setForm(p => ({ ...p, routeCode: e.target.value }))} placeholder="e.g. RT-001" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Route Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Northern Suburbs" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Service Type</label>
              <select value={form.serviceType} onChange={(e) => setForm(p => ({ ...p, serviceType: e.target.value as any }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                <option value="school_run">School Run</option>
                <option value="event">Event</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Bus Label</label>
              <input type="text" value={form.busLabel} onChange={(e) => setForm(p => ({ ...p, busLabel: e.target.value }))} placeholder="e.g. Bus 7" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Capacity</label>
              <input type="number" value={form.capacity} onChange={(e) => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="e.g. 45" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Route description…" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
          </div>

          {/* Stops builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-600">Stops</label>
              <button type="button" onClick={addStop} className="text-xs font-bold text-sky-600 hover:text-sky-800">+ Add Stop</button>
            </div>
            <div className="space-y-2">
              {form.stops.map((stop, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-slate-400 w-6 shrink-0">{idx + 1}.</span>
                  <input type="text" value={stop.label} onChange={(e) => { const stops = [...form.stops]; stops[idx].label = e.target.value; setForm(p => ({ ...p, stops })); }} placeholder="Stop label" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none" />
                  <input type="text" value={stop.address} onChange={(e) => { const stops = [...form.stops]; stops[idx].address = e.target.value; setForm(p => ({ ...p, stops })); }} placeholder="Address" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none" />
                  {form.stops.length > 1 && <button type="button" onClick={() => removeStop(idx)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="rounded-2xl bg-cyan-600 px-6 py-2.5 text-xs font-black text-white hover:bg-cyan-700 disabled:opacity-50">{saving ? "Creating…" : "Create Route"}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-2xl border border-slate-200 px-6 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      {/* Routes list */}
      {routes.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
          <Bus className="mb-4 h-12 w-12 text-slate-300" />
          <p className="font-bold text-slate-500">No routes created yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => (
            <div key={route._id} className={`rounded-3xl border bg-white p-6 shadow-sm ${!route.isActive ? "opacity-60" : "border-slate-200"}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[10px] font-bold text-cyan-700">{route.routeCode}</span>
                    <h3 className="font-black text-slate-950">{route.name}</h3>
                    {route.busLabel && <span className="text-[10px] text-slate-400">🚌 {route.busLabel}</span>}
                    {!route.isActive && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">Inactive</span>}
                  </div>
                  {route.description && <p className="text-xs text-slate-500 mb-2">{route.description}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{route.stops?.length ?? 0} stops</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{route.approvedBookings} active bookings</span>
                    {route.pendingBookings > 0 && <span className="flex items-center gap-1 text-amber-600 font-bold">{route.pendingBookings} pending</span>}
                    {route.driverName && <span className="flex items-center gap-1">Driver: {route.driverName}</span>}
                    {route.capacity && <span className="flex items-center gap-1">Capacity: {route.capacity}</span>}
                  </div>
                  {/* Stops list */}
                  {route.stops && route.stops.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {route.stops.map((stop: any, i: number) => (
                        <span key={stop._id || i} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] text-slate-600">
                          {i + 1}. {stop.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── UC-11 & Bookings Management Tab ───────────────────────── */

function BookingsTab({ bookings, approveMut, rejectMut }: { bookings: any[]; approveMut: any; rejectMut: any }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async (bookingId: Id<"transportBookings">) => {
    setLoading(bookingId);
    await approveMut({ bookingId });
    setLoading(null);
  };

  const handleReject = async (bookingId: Id<"transportBookings">) => {
    setLoading(bookingId);
    await rejectMut({ bookingId });
    setLoading(null);
  };

  const grouped = {
    pending: bookings.filter(b => b.status === "pending"),
    approved: bookings.filter(b => b.status === "approved"),
    rejected: bookings.filter(b => b.status === "rejected"),
  };

  return (
    <div className="space-y-8">
      {/* Pending */}
      <div>
        <h3 className="text-lg font-black text-slate-950 flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-amber-500" /> Pending Requests ({grouped.pending.length})
        </h3>
        {grouped.pending.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {grouped.pending.map((b) => (
              <div key={b._id} className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-950 text-sm">{b.learner?.fullName ?? b.learner?.email ?? "Learner"}</p>
                    <p className="text-xs text-slate-500">
                      Route: <span className="font-semibold">{b.route?.name ?? "—"}</span>
                      {b.pickupStop && <> • Pickup: {b.pickupStop.label}</>}
                      {b.dropoffStop && <> • Drop: {b.dropoffStop.label}</>}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Requested by {b.requestedBy?.fullName ?? b.requestedBy?.email} on {format(new Date(b.createdAt), "d MMM yyyy")}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(b._id)} disabled={loading === b._id} className="rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Approve</button>
                    <button onClick={() => handleReject(b._id)} disabled={loading === b._id} className="rounded-xl bg-rose-600 px-4 py-2 text-[10px] font-bold text-white hover:bg-rose-700 disabled:opacity-50">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved */}
      <div>
        <h3 className="text-lg font-black text-slate-950 flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Approved ({grouped.approved.length})
        </h3>
        <div className="space-y-2">
          {grouped.approved.map((b) => (
            <div key={b._id} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm flex items-center justify-between">
              <span className="font-bold text-slate-700">{b.learner?.fullName ?? "Learner"}</span>
              <span className="text-xs text-slate-500">{b.route?.name} • {b.pickupStop?.label ?? "—"} → {b.dropoffStop?.label ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── UC-15: Incidents Tab ───────────────────────── */

function IncidentsTab({ routes }: { routes: any[] }) {
  const allIncidents = routes.flatMap((r) => (r.recentIncidents ?? []).map((i: any) => ({ ...i, routeName: r.name, routeCode: r.routeCode })));
  const sorted = allIncidents.sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-rose-600" /> Transport Incidents ({sorted.length})
      </h2>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-300" />
          <p className="font-bold text-slate-500">No incidents reported.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((inc: any) => (
            <div key={inc._id} className={`rounded-3xl border p-5 ${inc.status === "open" ? "border-rose-200 bg-rose-50/30" : inc.status === "investigating" ? "border-amber-200 bg-amber-50/30" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${inc.status === "open" ? "bg-rose-100 text-rose-600" : inc.status === "investigating" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>{inc.status.toUpperCase()}</span>
                    <h3 className="font-black text-slate-950 text-sm">{inc.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{inc.description}</p>
                  <p className="text-[10px] text-slate-400">Route: {inc.routeName} ({inc.routeCode}) • {format(new Date(inc.createdAt), "d MMM yyyy HH:mm")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── UC-16: Notify Parents Tab ───────────────────────── */

function NotificationsTab() {
  const [form, setForm] = useState({ title: "", message: "", type: "info" as "info" | "warning" | "urgent" });
  const [sent, setSent] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    // In production, this would call a backend mutation to create notifications for all affected parents
    setSent(true);
    setForm({ title: "", message: "", type: "info" });
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
        <Bell className="h-5 w-5 text-amber-500" /> Notify Parents
      </h2>
      <p className="text-sm text-slate-500">Broadcast transport schedule changes, route updates, or delays to all parents of learners using the transport service.</p>

      {sent && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> Notification sent to all affected parents!
        </div>
      )}

      <form onSubmit={handleSend} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 max-w-2xl">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Notification Type</label>
          <div className="flex gap-2">
            {(["info", "warning", "urgent"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t }))} className={`rounded-xl px-4 py-2 text-xs font-bold transition ${form.type === t ? (t === "info" ? "bg-sky-100 text-sky-700" : t === "warning" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700") : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Subject *</label>
          <input type="text" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Route RT-003 delayed by 15 mins" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Message *</label>
          <textarea value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} rows={4} placeholder="Describe the transport update…" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 resize-none" />
        </div>
        <button type="submit" disabled={!form.title.trim() || !form.message.trim()} className="rounded-2xl bg-amber-500 px-6 py-2.5 text-xs font-black text-white transition hover:bg-amber-600 disabled:opacity-50">
          Send Notification to Parents
        </button>
      </form>
    </div>
  );
}

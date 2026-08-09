"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import {
  Bus, Users, CheckCircle2, XCircle, AlertTriangle,
  Shield, Route as RouteIcon, Plus, Clock,
} from "lucide-react";
import { format } from "date-fns";

type Tab = "routes" | "bookings" | "incidents";

const SERVICE_TYPES = ["school_run", "event", "special"] as const;
const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TransportAdminPage() {
  const user = useQuery(api.users.current);
  const isTransportAdmin = user?.role === "transport_admin" || user?.role === "admin";

  const routes = useQuery(api.transport.listRoutes);
  const bookings = useQuery(api.transport.listMyBookings);
  const allUsers = useQuery(api.users.list);
  const createRoute = useMutation(api.transport.createRoute);
  const approveBooking = useMutation(api.transport.approveBooking);
  const rejectBooking = useMutation(api.transport.rejectBooking);

  const [tab, setTab] = useState<Tab>("routes");
  const [showNewRoute, setShowNewRoute] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    routeCode: "",
    name: "",
    description: "",
    serviceType: "school_run" as (typeof SERVICE_TYPES)[number],
    capacity: "",
    driverUserId: "",
    busLabel: "",
  });
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [routeError, setRouteError] = useState<string | null>(null);
  const toggleDay = (day: string) => setScheduleDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  const [reassignRoute, setReassignRoute] = useState<Record<string, string>>({});
  const [bookingError, setBookingError] = useState<string | null>(null);

  if (user === undefined || routes === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  if (!isTransportAdmin) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-14">
        <Shield className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-black text-slate-950">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-500">This portal is for transport administrators only.</p>
      </main>
    );
  }

  const drivers = (allUsers ?? []).filter((u) => u.role === "driver");
  const pendingBookings = (bookings ?? []).filter((b) => b.status === "pending");
  const decidedBookings = (bookings ?? []).filter((b) => b.status !== "pending");
  const allIncidents = (routes ?? [])
    .flatMap((r) => (r.recentIncidents ?? []).map((inc: any) => ({ ...inc, routeName: r.name, routeCode: r.routeCode })))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.routeCode.trim() || !form.name.trim()) return;
    setSaving(true);
    setRouteError(null);
    try {
      await createRoute({
        routeCode: form.routeCode.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        serviceType: form.serviceType,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        driverUserId: form.driverUserId ? (form.driverUserId as Id<"users">) : undefined,
        busLabel: form.busLabel.trim() || undefined,
        scheduleDays: scheduleDays.length > 0 ? scheduleDays : undefined,
        scheduleTime: scheduleTime || undefined,
        stops: [],
      });
      setForm({ routeCode: "", name: "", description: "", serviceType: "school_run", capacity: "", driverUserId: "", busLabel: "" });
      setScheduleDays([]);
      setScheduleTime("");
      setShowNewRoute(false);
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : "Failed to create route.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (bookingId: Id<"transportBookings">) => {
    setBookingError(null);
    try {
      const routeId = reassignRoute[bookingId];
      await approveBooking({ bookingId, routeId: routeId ? (routeId as Id<"transportRoutes">) : undefined });
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to approve booking.");
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: "routes", label: "Routes", icon: RouteIcon },
    { key: "bookings", label: "Bookings", icon: Users, badge: pendingBookings.length },
    { key: "incidents", label: "Incidents", icon: AlertTriangle, badge: allIncidents.length || undefined },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 sm:px-10">
      <header className="mb-8 border-b border-slate-100 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="rounded-full bg-sky-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Transport Admin</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-950">Transport Hub</h1>
        <p className="mt-2 text-sm text-slate-500">Manage bus routes, approve transport bookings, and review incident reports.</p>
      </header>

      <div className="mb-8 flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${tab === key ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {!!badge && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white">{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Routes */}
      {tab === "routes" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
              <Bus className="h-5 w-5 text-sky-600" /> Bus Routes
            </h2>
            <button
              onClick={() => setShowNewRoute((v) => !v)}
              className="flex items-center gap-1.5 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" /> New Route
            </button>
          </div>

          {showNewRoute && (
            <form onSubmit={handleCreateRoute} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Route Code *</label>
                  <input value={form.routeCode} onChange={(e) => setForm((p) => ({ ...p, routeCode: e.target.value }))} placeholder="e.g. RT-01" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Name *</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Northside School Run" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Service Type</label>
                  <select value={form.serviceType} onChange={(e) => setForm((p) => ({ ...p, serviceType: e.target.value as any }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                    {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Driver</label>
                  <select value={form.driverUserId} onChange={(e) => setForm((p) => ({ ...p, driverUserId: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                    <option value="">Unassigned</option>
                    {drivers.map((d) => <option key={d._id} value={d._id}>{d.fullName ?? d.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Bus Label</label>
                  <input value={form.busLabel} onChange={(e) => setForm((p) => ({ ...p, busLabel: e.target.value }))} placeholder="e.g. Bus 04" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Capacity</label>
                  <input type="number" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} placeholder="e.g. 40" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none" />
                </div>
              </div>

              {/* Recurring schedule — used to catch a driver double-booked across routes */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Schedule</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {DAY_OPTIONS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black transition ${scheduleDays.includes(day) ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none" />
              </div>

              {routeError && (
                <p className="rounded-2xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">{routeError}</p>
              )}
              <button type="submit" disabled={saving || !form.routeCode.trim() || !form.name.trim()} className="rounded-2xl bg-sky-600 px-6 py-2.5 text-xs font-black text-white transition hover:bg-sky-700 disabled:opacity-50">
                {saving ? "Creating…" : "Create Route"}
              </button>
            </form>
          )}

          {(routes ?? []).length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
              <Bus className="mb-4 h-12 w-12 text-slate-300" />
              <p className="font-bold text-slate-500">No routes yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(routes ?? []).map((route: any) => (
                <div key={route._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">{route.routeCode}</p>
                      <h3 className="font-black text-slate-950">{route.name}</h3>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${route.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {route.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{route.driverName ?? "No driver assigned"} · {route.busLabel ?? "No bus"}</p>
                  {route.scheduleDays?.length > 0 && (
                    <p className="text-xs text-slate-500 mb-4">{route.scheduleDays.join(", ")} · {route.scheduleTime ?? "—"}</p>
                  )}
                  <div className="flex gap-4 text-xs font-bold text-slate-600">
                    <span>{route.totalBookings} total</span>
                    <span className="text-amber-600">{route.pendingBookings} pending</span>
                    <span className={route.capacity != null && route.approvedBookings >= route.capacity ? "text-rose-600" : "text-emerald-600"}>
                      {route.approvedBookings} approved{route.capacity != null ? ` / ${route.capacity}` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bookings */}
      {tab === "bookings" && (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-black text-slate-950 flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-amber-600" /> Pending Requests
            </h2>
            {bookingError && (
              <p className="mb-3 rounded-2xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">{bookingError}</p>
            )}
            {pendingBookings.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No pending booking requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingBookings.map((b: any) => (
                  <div key={b._id} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm gap-4">
                    <div>
                      <p className="font-bold text-sm text-slate-900">{b.learner?.fullName ?? b.learner?.email ?? "—"}</p>
                      <p className="text-xs text-slate-500">Requested: {b.route?.name ?? "—"} · by {b.requestedBy?.fullName ?? b.requestedBy?.email ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={reassignRoute[b._id] ?? b.routeId}
                        onChange={(e) => setReassignRoute((p) => ({ ...p, [b._id]: e.target.value }))}
                        className="rounded-xl border border-slate-200 px-2 py-1.5 text-[10px] font-bold focus:border-sky-500 focus:outline-none"
                        title="Assign to route"
                      >
                        {(routes ?? []).filter((r: any) => r.isActive).map((r: any) => (
                          <option key={r._id} value={r._id}>{r.routeCode} ({r.approvedBookings}{r.capacity != null ? `/${r.capacity}` : ""})</option>
                        ))}
                      </select>
                      <button onClick={() => handleApprove(b._id)} className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button onClick={() => rejectBooking({ bookingId: b._id })} className="flex items-center gap-1.5 rounded-2xl bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 hover:bg-rose-100">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {decidedBookings.length > 0 && (
            <div>
              <h2 className="text-xl font-black text-slate-950 mb-4">History</h2>
              <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-4 bg-slate-50 px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                  <span>Learner</span>
                  <span>Route</span>
                  <span>Status</span>
                </div>
                {decidedBookings.map((b: any) => (
                  <div key={b._id} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center border-t border-slate-100 px-6 py-3">
                    <span className="text-sm font-bold text-slate-800">{b.learner?.fullName ?? b.learner?.email ?? "—"}</span>
                    <span className="text-xs text-slate-500">{b.route?.name ?? "—"}</span>
                    <span className={`text-[10px] font-black uppercase ${b.status === "approved" ? "text-emerald-600" : "text-rose-600"}`}>{b.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Incidents */}
      {tab === "incidents" && (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" /> Incident Reports
          </h2>
          {allIncidents.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No incidents reported.</p>
          ) : (
            <div className="space-y-3">
              {allIncidents.map((inc: any) => (
                <div key={inc._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-sm text-slate-900">{inc.title}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${inc.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{inc.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{inc.routeCode} — {inc.routeName} · {format(inc.updatedAt, "MMM d, p")}</p>
                  <p className="text-sm text-slate-600">{inc.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

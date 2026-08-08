"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import {
  Bus, Users, CheckCircle2, XCircle, AlertTriangle, QrCode,
  Shield, ScanLine, Clock, MapPin, UserCheck
} from "lucide-react";
import { format } from "date-fns";

type Tab = "scan" | "passengers" | "incident";

export default function DriverPage() {
  const user = useQuery(api.users.current);
  const routes = useQuery(api.transport.listRoutes);
  const bookings = useQuery(api.transport.listMyBookings);
  const scanMut = useMutation(api.transport.scanBusPassengerByQR);
  const reportIncident = useMutation(api.transport.reportIncident);

  const [tab, setTab] = useState<Tab>("scan");
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<{ text: string; ok: boolean } | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  // Incident form
  const [incForm, setIncForm] = useState({ routeId: "", title: "", description: "" });
  const [incSaving, setIncSaving] = useState(false);
  const [incSent, setIncSent] = useState(false);

  if (user === undefined || routes === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  if (user?.role !== "driver" && user?.role !== "admin") {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-14">
        <Shield className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-black text-slate-950">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-500">This portal is for bus drivers only.</p>
      </main>
    );
  }

  const myRoutes = routes.filter((r) => r.driverUserId === user?._id || user?.role === "admin");
  const selectedRoute = myRoutes.find((r) => r._id === selectedRouteId) ?? myRoutes[0];

  const routeBookings = (bookings ?? []).filter((b) => b.routeId === selectedRoute?._id && b.status === "approved");

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim() || !selectedRoute) return;
    setScanLoading(true);
    setScanResult(null);
    try {
      const result = await scanMut({
        routeId: selectedRoute._id as Id<"transportRoutes">,
        learnerUserId: scanInput.trim() as Id<"users">,
        scanType: "board" as const,
      });
      setScanResult({ text: `✓ ${(result as any)?.fullName ?? (result as any)?.firstName ?? "Student"} boarded successfully!`, ok: true });
      setScanInput("");
    } catch (e) {
      setScanResult({ text: e instanceof Error ? e.message : "Scan failed.", ok: false });
    } finally {
      setScanLoading(false);
    }
  };

  const handleIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incForm.routeId || !incForm.title.trim() || !incForm.description.trim()) return;
    setIncSaving(true);
    try {
      await reportIncident({
        routeId: incForm.routeId as Id<"transportRoutes">,
        title: incForm.title.trim(),
        description: incForm.description.trim(),
      });
      setIncForm({ routeId: "", title: "", description: "" });
      setIncSent(true);
      setTimeout(() => setIncSent(false), 3000);
    } finally {
      setIncSaving(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "scan", label: "Boarding Scanner", icon: ScanLine },
    { key: "passengers", label: "Passenger List", icon: Users },
    { key: "incident", label: "Report Incident", icon: AlertTriangle },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 sm:px-10">
      <header className="mb-8 border-b border-slate-100 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="rounded-full bg-sky-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Driver Portal</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-950">Bus Operations</h1>
        <p className="mt-2 text-sm text-slate-500">Scan boarding passes, view passenger manifests, and report incidents.</p>
      </header>

      {/* Route selector */}
      {myRoutes.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Route:</span>
          {myRoutes.map((r) => (
            <button
              key={r._id}
              onClick={() => setSelectedRouteId(r._id)}
              className={`rounded-2xl border px-4 py-2 text-xs font-bold transition ${
                selectedRoute?._id === r._id
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {r.routeCode} — {r.name}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8 flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${tab === key ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* UC-13: Boarding Scanner */}
      {tab === "scan" && (
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-sky-600" /> Boarding Scanner
          </h2>

          {scanResult && (
            <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${scanResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {scanResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {scanResult.text}
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm max-w-lg">
            <div className="flex flex-col items-center mb-6">
              <div className="h-32 w-32 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
                <QrCode className="h-16 w-16 text-slate-300" />
              </div>
              <p className="text-xs text-slate-500 text-center">Enter the student's QR code data or scan using a connected device.</p>
            </div>

            <form onSubmit={handleScan} className="space-y-3">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Enter QR code data or student ID…"
                autoFocus
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-center focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
              />
              <button type="submit" disabled={scanLoading || !scanInput.trim()} className="w-full rounded-2xl bg-sky-600 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-50">
                {scanLoading ? "Scanning…" : "Verify Boarding"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Passengers */}
      {tab === "passengers" && (
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" /> Passenger Manifest — {selectedRoute?.name ?? "No route"}
          </h2>

          {routeBookings.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
              <Users className="mb-4 h-12 w-12 text-slate-300" />
              <p className="font-bold text-slate-500">No passengers on this route.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-slate-50 px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                <span>Learner</span>
                <span>Pickup</span>
                <span>Drop-off</span>
              </div>
              {routeBookings.map((b) => (
                <div key={b._id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center border-t border-slate-100 px-6 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{b.learner?.fullName ?? b.learner?.email ?? "—"}</p>
                  </div>
                  <span className="text-xs text-slate-500">{b.pickupStop?.label ?? "—"}</span>
                  <span className="text-xs text-slate-500">{b.dropoffStop?.label ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* UC-15: Report Incident */}
      {tab === "incident" && (
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" /> Report Bus Breakdown / Emergency
          </h2>

          {incSent && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" /> Incident reported! Admin and parents have been notified.
            </div>
          )}

          <form onSubmit={handleIncident} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 max-w-2xl">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Route *</label>
              <select value={incForm.routeId} onChange={(e) => setIncForm(p => ({ ...p, routeId: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                <option value="">Select route…</option>
                {myRoutes.map((r) => (
                  <option key={r._id} value={r._id}>{r.routeCode} — {r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Incident Title *</label>
              <input type="text" value={incForm.title} onChange={(e) => setIncForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Engine breakdown on N2" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Description *</label>
              <textarea value={incForm.description} onChange={(e) => setIncForm(p => ({ ...p, description: e.target.value }))} rows={4} placeholder="Describe the breakdown or emergency situation in detail…" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 resize-none" />
            </div>
            <button type="submit" disabled={incSaving || !incForm.routeId || !incForm.title.trim() || !incForm.description.trim()} className="rounded-2xl bg-rose-600 px-6 py-2.5 text-xs font-black text-white transition hover:bg-rose-700 disabled:opacity-50">
              {incSaving ? "Reporting…" : "🚨 Report Emergency"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

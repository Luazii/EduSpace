"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import { Trophy, Users, MapPin, Clock, User, CheckCircle2, XCircle } from "lucide-react";

export default function SportsPage() {
  const sports = useQuery(api.sports.listForStudent);
  const registerMut = useMutation(api.sports.register);
  const withdrawMut = useMutation(api.sports.withdraw);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handle = async (action: "register" | "withdraw", sportId: Id<"sports">, regId?: Id<"sportRegistrations"> | null) => {
    setLoading(sportId);
    setMessage(null);
    try {
      if (action === "register") {
        await registerMut({ sportId });
        setMessage({ text: "Registered successfully!", ok: true });
      } else {
        await withdrawMut({ registrationId: regId! });
        setMessage({ text: "Withdrawn from sport.", ok: false });
      }
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Something went wrong.", ok: false });
    } finally {
      setLoading(null);
    }
  };

  if (sports === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  const myCount = sports.filter((s) => s.isRegistered).length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Extra-Curricular</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Sports Selection</h1>
        <p className="mt-2 text-sm text-slate-500">
          Choose the sports you want to participate in this term.
          {myCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> {myCount} registered
            </span>
          )}
        </p>
      </header>

      {message && (
        <div className={`mb-6 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {message.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {sports.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
          <Trophy className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="font-bold text-slate-600">No sports available</h3>
          <p className="mt-1 text-sm text-slate-400">Sports will appear here once the school adds them.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sports.map((sport) => (
            <div
              key={sport._id}
              className={`rounded-3xl border bg-white p-6 shadow-sm transition ${sport.isRegistered ? "border-emerald-200 ring-2 ring-emerald-100" : "border-slate-200"}`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-950">{sport.name}</h3>
                  {sport.category && (
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                      {sport.category}
                    </span>
                  )}
                </div>
                {sport.isRegistered && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                )}
              </div>

              {sport.description && (
                <p className="mb-4 text-xs text-slate-500 leading-relaxed">{sport.description}</p>
              )}

              <div className="mb-4 space-y-1.5 text-xs text-slate-500">
                {sport.coachName && (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>Coach: <span className="font-semibold text-slate-700">{sport.coachName}</span></span>
                  </div>
                )}
                {sport.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{sport.venue}</span>
                  </div>
                )}
                {sport.schedule && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{sport.schedule}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>
                    {sport.enrolledCount} registered
                    {sport.maxCapacity != null && ` / ${sport.maxCapacity} max`}
                    {sport.isFull && !sport.isRegistered && (
                      <span className="ml-1 font-bold text-rose-600">Full</span>
                    )}
                  </span>
                </div>
              </div>

              {sport.isRegistered ? (
                <button
                  onClick={() => handle("withdraw", sport._id, sport.registrationId as Id<"sportRegistrations">)}
                  disabled={loading === sport._id}
                  className="w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                >
                  {loading === sport._id ? "Processing…" : "Withdraw"}
                </button>
              ) : (
                <button
                  onClick={() => handle("register", sport._id)}
                  disabled={loading === sport._id || sport.isFull}
                  className="w-full rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading === sport._id ? "Processing…" : sport.isFull ? "Sport full" : "Register"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

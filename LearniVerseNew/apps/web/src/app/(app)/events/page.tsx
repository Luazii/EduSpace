"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import {
  Ticket, Calendar, MapPin, Users, CheckCircle2, XCircle,
  Plus, QrCode, Clock, ArrowRight
} from "lucide-react";
import { format } from "date-fns";

export default function EventsPage() {
  const user = useQuery(api.users.current);
  const events = useQuery(api.events.listEvents, {});
  const myTickets = useQuery(api.events.listMyTickets);
  const getTicketMut = useMutation(api.events.getTicket);

  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [viewTicket, setViewTicket] = useState<string | null>(null);

  const handleGetTicket = async (eventId: Id<"events">) => {
    setLoading(eventId);
    setMessage(null);
    try {
      await getTicketMut({ eventId });
      setMessage({ text: "Ticket secured! Check 'My Tickets' below.", ok: true });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Failed to get ticket.", ok: false });
    } finally {
      setLoading(null);
    }
  };

  if (events === undefined || user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-600 border-t-transparent" />
      </div>
    );
  }

  const hasTicket = (eventId: Id<"events">) =>
    myTickets?.some((t) => t.eventId === eventId && t.status !== "cancelled");

  const upcomingEvents = events.filter((e) => e.eventDate >= Date.now());
  const pastEvents = events.filter((e) => e.eventDate < Date.now());

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 sm:px-10">
      <header className="mb-8 border-b border-slate-100 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="rounded-full bg-rose-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Events Hub</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-950">School Events & Tickets</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-2xl">
          Browse upcoming sports events, tournaments, and school gatherings. Get your electronic tickets with QR codes for easy entry.
        </p>
      </header>

      {message && (
        <div className={`mb-6 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {message.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Upcoming Events */}
      <section className="mb-12">
        <h2 className="text-xl font-black text-slate-950 flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-rose-600" /> Upcoming Events ({upcomingEvents.length})
        </h2>

        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
            <Ticket className="mb-4 h-12 w-12 text-slate-300" />
            <p className="font-bold text-slate-500">No upcoming events.</p>
            <p className="mt-1 text-sm text-slate-400">Events will appear here when they are published by the administration.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => {
              const owned = hasTicket(event._id);
              return (
                <div key={event._id} className={`rounded-3xl border bg-white p-6 shadow-sm transition hover:shadow-md ${owned ? "border-emerald-200 ring-2 ring-emerald-100" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-base font-black text-slate-950">{event.title}</h3>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">{event.description}</p>
                    </div>
                    {owned && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 ml-2" />}
                  </div>

                  <div className="mb-4 space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">{format(new Date(event.eventDate), "EEEE, d MMMM yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{format(new Date(event.eventDate), "HH:mm")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{event.location}</span>
                    </div>
                    {event.capacity && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>Capacity: {event.capacity}</span>
                      </div>
                    )}
                  </div>

                  {owned ? (
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 py-2.5 text-center text-xs font-bold text-emerald-700">
                      ✓ Ticket Secured
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGetTicket(event._id)}
                      disabled={loading === event._id}
                      className="w-full rounded-2xl bg-rose-600 py-2.5 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                    >
                      {loading === event._id ? "Processing…" : "Get Ticket"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* My Tickets */}
      {myTickets && myTickets.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2 mb-6">
            <QrCode className="h-5 w-5 text-indigo-600" /> My Tickets ({myTickets.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myTickets.map((ticket) => (
              <div key={ticket._id} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-slate-950 text-sm">{ticket.event?.title ?? "Event"}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      ticket.status === "valid" ? "bg-emerald-50 text-emerald-600"
                      : ticket.status === "scanned" ? "bg-sky-50 text-sky-600"
                      : "bg-rose-50 text-rose-600"
                    }`}>
                      {ticket.status.toUpperCase()}
                    </span>
                  </div>
                  {ticket.event && (
                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(ticket.event.eventDate), "d MMM yyyy, HH:mm")}</div>
                      <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ticket.event.location}</div>
                    </div>
                  )}
                </div>

                {/* QR Code area */}
                <div className="border-t border-dashed border-slate-200 bg-slate-50 p-5">
                  {viewTicket === ticket._id ? (
                    <div className="text-center">
                      <div className="inline-flex flex-col items-center rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                        <QrCode className="h-24 w-24 text-slate-800 mb-3" />
                        <p className="text-xs font-mono font-bold text-slate-700 tracking-widest">{ticket.ticketCode}</p>
                      </div>
                      <p className="mt-3 text-[10px] text-slate-400">Present this QR code at the entrance</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setViewTicket(viewTicket === ticket._id ? null : ticket._id)}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                    >
                      <QrCode className="h-3.5 w-3.5" /> View E-Ticket
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section>
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2 mb-6">
            <Clock className="h-5 w-5 text-slate-400" /> Past Events
          </h2>
          <div className="space-y-3">
            {pastEvents.map((event) => (
              <div key={event._id} className="rounded-3xl border border-slate-200 bg-white p-5 opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-slate-950">{event.title}</h3>
                    <p className="text-xs text-slate-500">{format(new Date(event.eventDate), "d MMM yyyy")} — {event.location}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">Ended</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

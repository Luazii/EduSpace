"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export function BookingPageClient() {
  const rooms = useQuery(api.rooms.list) ?? [];
  const timeSlots = useQuery(api.timeSlots.list) ?? [];
  const bookings = useQuery(api.bookings.listMine) ?? [];
  const createBooking = useMutation(api.bookings.create);

  const [roomId, setRoomId] = useState("");
  const [timeSlotId, setTimeSlotId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filteredTimeSlots = timeSlots.filter((slot) =>
    roomId ? slot.roomId === roomId : true,
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomId || !timeSlotId || !bookingDate) {
      return;
    }

    setIsSaving(true);

    try {
      await createBooking({
        roomId: roomId as never,
        timeSlotId: timeSlotId as never,
        bookingDate,
      });

      setRoomId("");
      setTimeSlotId("");
      setBookingDate("");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <form
        onSubmit={onSubmit}
        className="rounded-[1.75rem] border border-black/10 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
          Book a room
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Study room bookings
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Pick a room, choose a time slot, and reserve your study session.
        </p>
        <div className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Room
            <select
              value={roomId}
              onChange={(event) => {
                setRoomId(event.target.value);
                setTimeSlotId("");
              }}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room._id} value={room._id}>
                  {room.roomCode} · {room.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Time slot
            <select
              value={timeSlotId}
              onChange={(event) => setTimeSlotId(event.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
            >
              <option value="">Select slot</option>
              {filteredTimeSlots.map((slot) => (
                <option key={slot._id} value={slot._id}>
                  {slot.slotName} · {slot.startTime} - {slot.endTime}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Booking date
            <input
              type="date"
              value={bookingDate}
              onChange={(event) => setBookingDate(event.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
            />
          </label>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400"
          >
            {isSaving ? "Booking..." : "Create booking"}
          </button>
        </div>
      </form>

      <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
          My bookings
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Upcoming reservations
        </h2>
        <div className="mt-6 grid gap-4">
          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-7 text-slate-500">
              No bookings yet.
            </div>
          ) : (
            bookings.map((booking) => (
              <article
                key={booking._id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {booking.room?.roomCode} · {booking.room?.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {booking.bookingDate} · {booking.timeSlot?.slotName}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    {booking.status}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

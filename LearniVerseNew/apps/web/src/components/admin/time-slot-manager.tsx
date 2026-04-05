"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export function TimeSlotManager() {
  const rooms = useQuery(api.rooms.list) ?? [];
  const timeSlots = useQuery(api.timeSlots.list) ?? [];
  const createTimeSlot = useMutation(api.timeSlots.create);

  const [roomId, setRoomId] = useState("");
  const [slotName, setSlotName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomId || !slotName.trim() || !startTime || !endTime) {
      return;
    }

    setIsSaving(true);

    try {
      await createTimeSlot({
        roomId: roomId as never,
        slotName: slotName.trim(),
        startTime,
        endTime,
      });

      setRoomId("");
      setSlotName("");
      setStartTime("");
      setEndTime("");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form
        onSubmit={onSubmit}
        className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
      >
        <SectionIntro
          eyebrow="Create time slot"
          title="Define booking windows."
          body="Students book a room against one of these named time windows."
        />
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Room
            <select
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
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
          <Input label="Slot name" value={slotName} onChange={setSlotName} placeholder="Morning session" />
          <Input label="Start time" value={startTime} onChange={setStartTime} placeholder="08:00" type="time" />
          <Input label="End time" value={endTime} onChange={setEndTime} placeholder="10:00" type="time" />
          <button
            type="submit"
            disabled={isSaving || rooms.length === 0}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400"
          >
            {isSaving ? "Saving..." : "Add time slot"}
          </button>
        </div>
      </form>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <SectionIntro
          eyebrow="Existing time slots"
          title={`${timeSlots.length} slot${timeSlots.length === 1 ? "" : "s"} ready`}
          body="Bookings will use these room-linked session windows."
        />
        <div className="mt-6 grid gap-3">
          {timeSlots.length === 0 ? (
            <EmptyState message="No time slots yet." />
          ) : (
            timeSlots.map((slot) => (
              <article
                key={slot._id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">{slot.slotName}</h3>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    {slot.startTime} - {slot.endTime}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {slot.room?.roomCode} · {slot.room?.name}
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="text-sm leading-7 text-slate-600">{body}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
      />
    </label>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-7 text-slate-500">
      {message}
    </div>
  );
}

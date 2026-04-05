"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export function RoomManager() {
  const rooms = useQuery(api.rooms.list) ?? [];
  const createRoom = useMutation(api.rooms.create);

  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [campus, setCampus] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomCode.trim() || !name.trim() || !campus.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      await createRoom({
        roomCode: roomCode.trim(),
        name: name.trim(),
        campus: campus.trim(),
        capacity: capacity ? Number(capacity) : undefined,
      });

      setRoomCode("");
      setName("");
      setCampus("");
      setCapacity("");
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
          eyebrow="Create room"
          title="Add a study venue."
          body="Rooms become the foundation for time slots and booking availability."
        />
        <div className="mt-6 grid gap-4">
          <Input label="Room code" value={roomCode} onChange={setRoomCode} placeholder="R201" />
          <Input label="Room name" value={name} onChange={setName} placeholder="Main library seminar room" />
          <Input label="Campus" value={campus} onChange={setCampus} placeholder="ML Sultan" />
          <Input label="Capacity" value={capacity} onChange={setCapacity} placeholder="40" type="number" />
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400"
          >
            {isSaving ? "Saving..." : "Add room"}
          </button>
        </div>
      </form>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <SectionIntro
          eyebrow="Existing rooms"
          title={`${rooms.length} room${rooms.length === 1 ? "" : "s"} ready`}
          body="Students will book against these once time slots are added."
        />
        <div className="mt-6 grid gap-3">
          {rooms.length === 0 ? (
            <EmptyState message="No rooms yet." />
          ) : (
            rooms.map((room) => (
              <article
                key={room._id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">
                    {room.roomCode} · {room.name}
                  </h3>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    {room.campus}
                  </span>
                </div>
                {typeof room.capacity === "number" ? (
                  <p className="mt-3 text-sm text-slate-600">Capacity: {room.capacity}</p>
                ) : null}
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

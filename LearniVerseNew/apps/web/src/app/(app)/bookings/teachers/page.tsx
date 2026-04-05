"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import { Users, ArrowRight, CalendarDays } from "lucide-react";

export default function BrowseTeachersPage() {
  const teachers = useQuery(api.teacherBookings.listTeachers);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-14 sm:px-10">
      <header className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-700">
          Book a Meeting
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">
          Choose a Teacher
        </h1>
        <p className="text-sm text-slate-500 max-w-xl">
          Select a teacher to view their available time slots and schedule a meeting.
        </p>
      </header>

      {teachers === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-200 bg-white p-20 text-center">
          <Users className="h-12 w-12 text-slate-200 mb-4" />
          <h3 className="font-bold text-slate-950">No Teachers Available</h3>
          <p className="mt-2 text-sm text-slate-500">
            There are no active teachers yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <Link
              key={teacher._id}
              href={`/bookings/${teacher._id}`}
              className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-white">
                  {(teacher.fullName ?? teacher.email)[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 group-hover:text-sky-700 transition">
                    {teacher.fullName ?? teacher.email}
                  </h3>
                  <p className="text-xs text-slate-400">{teacher.email}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <CalendarDays className="h-3.5 w-3.5" />
                Mon – Fri · 08:00 – 16:00
              </div>

              <div className="mt-4 flex items-center justify-end gap-1 text-sm font-semibold text-sky-700 group-hover:text-sky-900 transition">
                View Availability
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import { Users, ArrowRight, GraduationCap, Heart } from "lucide-react";

export default function TeacherBrowseStudentsPage() {
  const data = useQuery(api.teacherBookings.listMyStudentsAndParents);

  const students = data?.students ?? [];
  const parents = data?.parents ?? [];
  const total = students.length + parents.length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-14 sm:px-10">
      <header className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-700">
          Request a Meeting
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">
          Choose a Student or Parent
        </h1>
        <p className="text-sm text-slate-500 max-w-xl">
          Select a student or parent to schedule a meeting using your available
          time slots.
        </p>
      </header>

      {data === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-200 bg-white p-20 text-center">
          <Users className="h-12 w-12 text-slate-200 mb-4" />
          <h3 className="font-bold text-slate-950">No Students Yet</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-xs">
            Once students enrol in your courses they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {students.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-slate-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Students
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((person: any) => (
                  <PersonCard
                    key={person._id}
                    person={person}
                    badge="Student"
                    badgeColor="sky"
                  />
                ))}
              </div>
            </section>
          )}

          {parents.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-slate-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Parents
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {parents.map((person: any) => (
                  <PersonCard
                    key={person._id}
                    person={person}
                    badge="Parent"
                    badgeColor="violet"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function PersonCard({
  person,
  badge,
  badgeColor,
}: {
  person: any;
  badge: string;
  badgeColor: "sky" | "violet";
}) {
  const initials = (person.fullName ?? person.email)[0].toUpperCase();
  const avatarBg = badgeColor === "sky" ? "bg-sky-600" : "bg-violet-600";
  const badgeClasses =
    badgeColor === "sky"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : "bg-violet-50 text-violet-700 border-violet-200";

  return (
    <Link
      href={`/bookings/with/${person._id}`}
      className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100"
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white ${avatarBg}`}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-bold text-slate-950 transition group-hover:text-sky-700">
            {person.fullName ?? person.email}
          </h3>
          <p className="truncate text-xs text-slate-400">{person.email}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${badgeClasses}`}
        >
          {badge}
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-sky-700 transition group-hover:text-sky-900">
          Schedule
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

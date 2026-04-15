import Link from "next/link";

import { FacultyManager } from "@/components/admin/faculty-manager";

export default function AdminFacultiesPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      <div className="grid w-full gap-6">
        <AdminHeader
          eyebrow="Admin setup"
          title="Grades & Levels"
          body="Manage school grades and academic levels across the platform."
        />
        <FacultyManager />
      </div>
    </main>
  );
}

function AdminHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
        {eyebrow}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/qualifications"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
          >
            Curriculums
          </Link>
          <Link
            href="/admin/courses"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
          >
            Subjects
          </Link>
        </div>
      </div>
    </section>
  );
}

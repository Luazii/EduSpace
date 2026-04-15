import Link from "next/link";

import { CourseManager } from "@/components/admin/course-manager";

export default function AdminCoursesPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      <div className="grid w-full gap-6">
        <AdminHeader
          eyebrow="Admin setup"
          title="Subjects"
          body="The subject registry is now connected end to end: admin setup on one side and a live student-facing list on the other."
        />
        <CourseManager />
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
            href="/admin/faculties"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
          >
            Grades
          </Link>
          <Link
            href="/admin/qualifications"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
          >
            Curriculums
          </Link>
        </div>
      </div>
    </section>
  );
}

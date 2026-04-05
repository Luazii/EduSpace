"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export function CourseCatalog() {
  const courses = useQuery(api.courses.list, {}) ?? [];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {courses.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-sm leading-7 text-slate-500 md:col-span-2 xl:col-span-3">
          No courses yet. Add the first faculty, qualification, and course from the admin pages to bring this catalog to life.
        </div>
      ) : (
        courses.map((course) => (
          <article
            key={course._id}
            className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {course.courseCode}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  {course.courseName}
                </h2>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                {course.department}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
              {course.faculty?.name ? <span>{course.faculty.name}</span> : null}
              {course.qualification?.name ? <span>{course.qualification.name}</span> : null}
              {typeof course.semester === "number" ? <span>Semester {course.semester}</span> : null}
            </div>
            <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
              {course.description ?? "Description coming next as the classroom experience fills out."}
            </p>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">
                {typeof course.price === "number" ? `R ${course.price.toFixed(2)}` : "Pricing TBD"}
              </p>
              <div className="flex gap-2">
                <Link
                  href={`/courses/${course._id}`}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open
                </Link>
                <Link
                  href="/apply"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
                >
                  Apply
                </Link>
              </div>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

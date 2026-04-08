"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export function ClassroomView() {
  const courses = useQuery(api.enrollments.listMyActiveCourses) ?? [];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {courses.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-sm leading-7 text-slate-500 md:col-span-2 xl:col-span-3 text-center">
          You are not currently enrolled in any subjects.
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
              {course.description ?? "Classroom resources, assignments, and curriculum materials."}
            </p>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                Enrolled
              </span>
              <div className="flex gap-2">
                <Link
                  href={`/courses/${course._id}`}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Enter Classroom
                </Link>
              </div>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

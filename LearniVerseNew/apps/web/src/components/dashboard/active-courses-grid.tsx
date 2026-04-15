"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export function ActiveCoursesGrid() {
  const activeCourses = useQuery(api.enrollments.listMyActiveCourses);

  if (activeCourses === undefined) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-[1.75rem] bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (activeCourses.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {activeCourses.filter((c) => !!c).map((course) => (
        <Link
          key={course._id}
          href={`/courses/${course._id}`}
          className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/70 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.05)] transition-all hover:border-slate-300 hover:shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm"
        >
          <div className="flex flex-1 flex-col">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-700">
              {course.department ?? course.courseCode}
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 group-hover:text-sky-900">
              {course.courseName}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {course.department ?? "Subject"}
            </p>
            <p className="mt-4 line-clamp-2 text-sm leading-7 text-slate-600">
              {course.description ?? "No description available for this subject."}
            </p>
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
            <div className="text-xs font-medium text-slate-400">
              Enrolled {new Date(course.enrolledAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-950 group-hover:text-sky-700">
              Enter Classroom
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

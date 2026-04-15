"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState } from "react";
import { 
  ClipboardCheck, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Trophy,
  GraduationCap,
  BookOpen,
  FileBarChart2,
  CheckCircle2,
  Download
} from "lucide-react";

export default function GradebookPage() {
  const gradebook = useQuery(api.courses.getGradebook, {});
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  const toggleCourse = (id: string) => {
    setExpandedCourses(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getGradeColor = (percent: number | null) => {
    if (percent === null) return "text-slate-400";
    if (percent >= 75) return "text-emerald-600";
    if (percent >= 50) return "text-sky-600";
    return "text-rose-600";
  };

  if (gradebook === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
            <span className="cursor-pointer hover:text-slate-900">Admin</span>
            <span>/</span>
            <span className="text-slate-900">Reports</span>
          </nav>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
            School Performance Monitoring
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            School Master Markbook
          </h1>
        </div>

        <div className="flex gap-4">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3 pl-12 pr-4 text-sm shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
            />
          </div>
          <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </header>

      <section className="space-y-6">
        {gradebook?.filter(c => c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) || c.courseCode.toLowerCase().includes(searchQuery.toLowerCase())).map((course) => (
          <div 
            key={course.courseId}
            className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_15px_40px_rgba(15,23,42,0.04)]"
          >
            <button 
              onClick={() => toggleCourse(course.courseId)}
              className="flex w-full items-center justify-between p-8 text-left transition hover:bg-slate-50/50"
            >
              <div className="flex items-center gap-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <BookOpen className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-950">{course.courseName}</h3>
                  <p className="text-sm font-medium text-slate-500">{course.courseCode} • {course.students.length} Enrolled</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="hidden text-right md:block">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Class Average</p>
                  <p className="text-xl font-black text-slate-950">
                    {course.students.length > 0 
                      ? (course.students.reduce((sum, s) => sum + (s.weightedAverage || 0), 0) / course.students.filter(s => s.weightedAverage !== null).length || 0).toFixed(1) + "%"
                      : "N/A"
                    }
                  </p>
                </div>
                {expandedCourses[course.courseId] ? <ChevronUp className="h-6 w-6 text-slate-400" /> : <ChevronDown className="h-6 w-6 text-slate-400" />}
              </div>
            </button>

            {expandedCourses[course.courseId] && (
              <div className="border-t border-slate-100 bg-slate-50/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        <th className="px-8 py-4">Student</th>
                        <th className="px-8 py-4">Student ID</th>
                        <th className="px-8 py-4 text-center">Assignments</th>
                        <th className="px-8 py-4 text-center">Quizzes</th>
                        <th className="px-8 py-4 text-center">Current Total</th>
                        <th className="px-8 py-4 text-right">Result Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {course.students.map((student) => (
                        <tr key={student.userId} className="group transition hover:bg-white">
                          <td className="whitespace-nowrap px-8 py-5">
                            <div className="font-bold text-slate-900">{student.fullName}</div>
                          </td>
                          <td className="whitespace-nowrap px-8 py-5 text-sm font-mono text-slate-500">
                            {student.studentNumber}
                          </td>
                          <td className="whitespace-nowrap px-8 py-5 text-center font-bold text-slate-700">
                            {student.assignmentPercent !== null ? student.assignmentPercent.toFixed(1) + "%" : "-"}
                          </td>
                          <td className="whitespace-nowrap px-8 py-5 text-center font-bold text-slate-700">
                            {student.quizPercent !== null ? student.quizPercent.toFixed(1) + "%" : "-"}
                          </td>
                          <td className="whitespace-nowrap px-8 py-5 text-center">
                            <span className={`text-lg font-black ${getGradeColor(student.weightedAverage)}`}>
                              {student.weightedAverage !== null ? student.weightedAverage.toFixed(1) + "%" : "N/A"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-8 py-5 text-right">
                            {student.isPublished ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Published
                              </span>
                            ) : (
                              <button className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-sky-700">
                                Finalize
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}

        {(!gradebook || gradebook.length === 0) && (
          <div className="flex flex-col items-center justify-center rounded-4xl bg-slate-50 p-20 text-center border-2 border-dashed border-slate-200">
            <FileBarChart2 className="h-16 w-16 text-slate-300 mb-6" />
            <h3 className="text-xl font-bold text-slate-900">No Markbook Data</h3>
            <p className="mt-2 text-slate-500 max-w-sm">
              Enrolled students and their marks will appear here once assignments and quizzes are graded.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

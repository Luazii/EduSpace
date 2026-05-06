"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState, useMemo } from "react";
import {
  Trophy,
  AlertTriangle,
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Flame,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

type SortKey = "name" | "mark" | "course";
type SortDir = "asc" | "desc";

export default function PerformancePage() {
  const topStudents = useQuery(api.marks.getTopStudentsOverview, {});
  const atRiskStudents = useQuery(api.marks.getAtRiskOverview, {});

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [topSort, setTopSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "mark", dir: "desc" });
  const [riskSort, setRiskSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "mark", dir: "asc" });

  const loading = topStudents === undefined || atRiskStudents === undefined;

  // Unique courses across both lists
  const allCourses = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of [...(topStudents ?? []), ...(atRiskStudents ?? [])]) {
      map.set(r.courseId, r.courseCode);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [topStudents, atRiskStudents]);

  function applyFilters<T extends { studentName: string | null; studentEmail: string; courseId: string; courseCode: string; courseName: string }>(
    rows: T[],
  ) {
    return rows.filter((r) => {
      const nameMatch = (r.studentName ?? r.studentEmail)
        .toLowerCase()
        .includes(search.toLowerCase());
      const courseMatch = courseFilter === "all" || r.courseId === courseFilter;
      return nameMatch && courseMatch;
    });
  }

  function sortRows<T extends { studentName: string | null; studentEmail: string; effectiveMark: number; courseName: string }>(
    rows: T[],
    sort: { key: SortKey; dir: SortDir },
  ): T[] {
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sort.key === "mark") cmp = a.effectiveMark - b.effectiveMark;
      else if (sort.key === "name")
        cmp = (a.studentName ?? a.studentEmail).localeCompare(b.studentName ?? b.studentEmail);
      else if (sort.key === "course") cmp = a.courseName.localeCompare(b.courseName);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }

  const filteredTop = sortRows(applyFilters(topStudents ?? []), topSort);
  const filteredRisk = sortRows(applyFilters(atRiskStudents ?? []), riskSort);
  const criticalCount = atRiskStudents?.filter((r) => r.status === "critical").length ?? 0;

  function SortButton({
    label,
    sortKey,
    state,
    setState,
  }: {
    label: string;
    sortKey: SortKey;
    state: { key: SortKey; dir: SortDir };
    setState: (s: { key: SortKey; dir: SortDir }) => void;
  }) {
    const active = state.key === sortKey;
    return (
      <button
        onClick={() =>
          setState({ key: sortKey, dir: active && state.dir === "asc" ? "desc" : "asc" })
        }
        className={`flex items-center gap-1 font-black uppercase tracking-widest text-[10px] transition ${active ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
      >
        {label}
        {active ? (
          state.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      {/* Header */}
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-900">Student Insights</span>
          </nav>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">
            Performance Analytics
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            Top &amp; At-Risk Students
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium text-slate-500">
            Identify top performers (≥75%) and students who need intervention (&lt;50%) across all subjects.
          </p>
        </div>
      </header>

      {/* Summary cards */}
      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Trophy}
          label="Top Performers"
          value={topStudents.length}
          sub="≥ 75% overall"
          color="emerald"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="At-Risk"
          value={(atRiskStudents?.length ?? 0) - criticalCount}
          sub="40–49% overall"
          color="amber"
        />
        <SummaryCard
          icon={Flame}
          label="Critical"
          value={criticalCount}
          sub="Below 40%"
          color="rose"
        />
        <SummaryCard
          icon={Users}
          label="Subjects Tracked"
          value={allCourses.length}
          sub="with graded data"
          color="sky"
        />
      </section>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
          />
        </div>
        <div className="relative flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-400" />
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
          >
            <option value="all">All Subjects</option>
            {allCourses.map(([id, code]) => (
              <option key={id} value={id}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-10">
        {/* Top Performers */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <Trophy className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-black text-slate-950">Top Performers</h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              {filteredTop.length}
            </span>
          </div>

          {filteredTop.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No top performers yet"
              body="Students with an overall mark ≥ 75% across graded work will appear here."
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-100 bg-slate-50/60">
                    <tr>
                      <th className="px-6 py-4">
                        <SortButton label="Student" sortKey="name" state={topSort} setState={setTopSort} />
                      </th>
                      <th className="px-6 py-4">
                        <SortButton label="Subject" sortKey="course" state={topSort} setState={setTopSort} />
                      </th>
                      <th className="px-6 py-4 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assignments</span>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quizzes</span>
                      </th>
                      <th className="px-6 py-4 text-right">
                        <SortButton label="Overall" sortKey="mark" state={topSort} setState={setTopSort} />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTop.map((row, i) => (
                      <tr key={`${row.studentId}-${row.courseId}`} className="transition hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-black text-emerald-700">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{row.studentName ?? "—"}</p>
                              <p className="text-xs text-slate-400">{row.studentEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            <BookOpen className="h-3 w-3" />
                            {row.courseCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                          {row.assignmentPct !== null ? `${row.assignmentPct}%` : "—"}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                          {row.quizPct !== null ? `${row.quizPct}%` : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <MarkBadge mark={row.effectiveMark} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* At-Risk Students */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
            <h2 className="text-lg font-black text-slate-950">At-Risk Students</h2>
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600">
              {filteredRisk.length}
            </span>
          </div>

          {filteredRisk.length === 0 ? (
            <EmptyState
              icon={TrendingDown}
              title="No at-risk students"
              body="Students with an overall mark below 50% across graded work will appear here."
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-100 bg-slate-50/60">
                    <tr>
                      <th className="px-6 py-4">
                        <SortButton label="Student" sortKey="name" state={riskSort} setState={setRiskSort} />
                      </th>
                      <th className="px-6 py-4">
                        <SortButton label="Subject" sortKey="course" state={riskSort} setState={setRiskSort} />
                      </th>
                      <th className="px-6 py-4 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assignments</span>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quizzes</span>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending</span>
                      </th>
                      <th className="px-6 py-4 text-right">
                        <SortButton label="Overall" sortKey="mark" state={riskSort} setState={setRiskSort} />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRisk.map((row) => (
                      <tr
                        key={`${row.studentId}-${row.courseId}`}
                        className={`transition hover:bg-slate-50/50 ${row.status === "critical" ? "bg-rose-50/30" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <StatusDot status={row.status} />
                            <div>
                              <p className="font-bold text-slate-900">{row.studentName ?? "—"}</p>
                              <p className="text-xs text-slate-400">{row.studentEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            <BookOpen className="h-3 w-3" />
                            {row.courseCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                          {row.assignmentPct !== null ? `${row.assignmentPct}%` : "—"}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                          {row.quizPct !== null ? `${row.quizPct}%` : "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.pendingAssignments > 0 ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                              {row.pendingAssignments} pending
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <MarkBadge mark={row.effectiveMark} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub: string;
  color: "emerald" | "amber" | "rose" | "sky";
}) {
  const palette = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    sky: "bg-sky-50 text-sky-600",
  };
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${palette[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <h3 className="mt-1.5 text-3xl font-black text-slate-950">{value}</h3>
      <p className="mt-1 text-xs font-semibold text-slate-400">{sub}</p>
    </div>
  );
}

function MarkBadge({ mark }: { mark: number }) {
  const color =
    mark >= 75
      ? "bg-emerald-50 text-emerald-700"
      : mark >= 50
        ? "bg-sky-50 text-sky-700"
        : mark >= 40
          ? "bg-amber-50 text-amber-700"
          : "bg-rose-50 text-rose-700";
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-black ${color}`}>
      {mark}%
    </span>
  );
}

function StatusDot({ status }: { status: "critical" | "at-risk" }) {
  return (
    <span
      className={`h-2.5 w-2.5 rounded-full shrink-0 ${status === "critical" ? "bg-rose-500" : "bg-amber-400"}`}
    />
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
      <Icon className="mb-4 h-12 w-12 text-slate-300" />
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{body}</p>
    </div>
  );
}

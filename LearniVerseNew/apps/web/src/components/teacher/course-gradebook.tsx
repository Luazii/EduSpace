"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Settings2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

type Props = { courseId: string };

type SortKey = "name" | "assignment" | "quiz" | "final";
type SortDir = "asc" | "desc";

function nscLevel(pct: number | null | undefined): {
  level: number;
  label: string;
  bg: string;
  text: string;
} {
  if (pct == null) return { level: 0, label: "—", bg: "bg-slate-100", text: "text-slate-400" };
  if (pct >= 80)
    return { level: 7, label: "L7 · Outstanding", bg: "bg-emerald-100", text: "text-emerald-800" };
  if (pct >= 70)
    return { level: 6, label: "L6 · Meritorious", bg: "bg-sky-100", text: "text-sky-800" };
  if (pct >= 60)
    return { level: 5, label: "L5 · Substantial", bg: "bg-blue-100", text: "text-blue-800" };
  if (pct >= 50)
    return { level: 4, label: "L4 · Adequate", bg: "bg-violet-100", text: "text-violet-800" };
  if (pct >= 40)
    return { level: 3, label: "L3 · Moderate", bg: "bg-amber-100", text: "text-amber-800" };
  if (pct >= 30)
    return {
      level: 2,
      label: "L2 · Elementary",
      bg: "bg-orange-100",
      text: "text-orange-800",
    };
  return { level: 1, label: "L1 · Not Achieved", bg: "bg-rose-100", text: "text-rose-800" };
}

export function CourseGradebook({ courseId }: Props) {
  const typedCourseId = courseId as Id<"courses">;

  const gradebook = useQuery(api.courses.getGradebook, { courseId: typedCourseId });
  const updateWeights = useMutation(api.courses.updateWeights);
  const course = gradebook?.[0];

  const [aWeight, setAWeight] = useState<number | null>(null);
  const [qWeight, setQWeight] = useState<number | null>(null);
  const [isSavingWeights, setIsSavingWeights] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterRisk, setFilterRisk] = useState(false);

  const serverAWeight = course ? (gradebook?.[0] as any)?.students?.[0] ? 50 : 50 : 50;
  const displayAWeight = aWeight ?? 50;
  const displayQWeight = qWeight ?? 50;

  const students = course?.students ?? [];

  const handleWeightChange = (field: "a" | "q", val: string) => {
    const n = Number(val);
    if (isNaN(n)) return;
    if (field === "a") {
      setAWeight(n);
      setQWeight(100 - n);
    } else {
      setQWeight(n);
      setAWeight(100 - n);
    }
    setWeightError(null);
  };

  async function saveWeights() {
    const a = aWeight ?? 50;
    const q = qWeight ?? 50;
    if (a + q !== 100) {
      setWeightError("Weights must sum to 100%.");
      return;
    }
    setIsSavingWeights(true);
    setWeightError(null);
    try {
      await updateWeights({ courseId: typedCourseId, assignmentWeight: a, quizWeight: q });
    } finally {
      setIsSavingWeights(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...students]
    .filter((s) => {
      if (!filterRisk) return true;
      return (s.weightedAverage ?? s.assignmentPercent ?? s.quizPercent ?? 100) < 50;
    })
    .sort((a, b) => {
      let av: number | string | null = null;
      let bv: number | string | null = null;
      if (sortKey === "name") {
        av = a.fullName ?? "";
        bv = b.fullName ?? "";
      } else if (sortKey === "assignment") {
        av = a.assignmentPercent;
        bv = b.assignmentPercent;
      } else if (sortKey === "quiz") {
        av = a.quizPercent;
        bv = b.quizPercent;
      } else {
        av = a.weightedAverage;
        bv = b.weightedAverage;
      }
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const atRiskCount = students.filter(
    (s) => typeof s.weightedAverage === "number" && s.weightedAverage < 50,
  ).length;
  const avgMark =
    students.filter((s) => s.weightedAverage !== null && s.weightedAverage !== undefined).length > 0
      ? Math.round(
          students
            .filter((s) => s.weightedAverage != null)
            .reduce((sum, s) => sum + (s.weightedAverage ?? 0), 0) /
            students.filter((s) => s.weightedAverage != null).length,
        )
      : null;

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-3 w-3 inline ml-1" />
      ) : (
        <ChevronDown className="h-3 w-3 inline ml-1" />
      )
    ) : null;

  if (gradebook === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7c4dff] border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      {/* Back */}
      <Link
        href="/teacher/reports"
        className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Reports
      </Link>

      {/* Header */}
      <header className="mb-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7c4dff]">
          Gradebook
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
          {course?.courseName ?? "Loading…"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{course?.courseCode}</p>
      </header>

      {/* Stats + Weight config */}
      <div className="mb-8 grid gap-4 md:grid-cols-[1fr_1fr_1fr_320px]">
        <StatCard label="Students" value={String(students.length)} />
        <StatCard
          label="Class average"
          value={avgMark !== null ? `${avgMark}%` : "—"}
          sub={avgMark !== null ? nscLevel(avgMark).label : undefined}
        />
        <StatCard
          label="At risk (<50%)"
          value={String(atRiskCount)}
          accent={atRiskCount > 0}
        />

        {/* Weight configurator */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4 text-slate-500" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Grade weighting
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-[10px] font-bold text-slate-500">Assignments %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={displayAWeight}
                onChange={(e) => handleWeightChange("a", e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-slate-950 transition"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-bold text-slate-500">Quizzes/Tests %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={displayQWeight}
                onChange={(e) => handleWeightChange("q", e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-slate-950 transition"
              />
            </label>
          </div>
          {weightError && (
            <p className="mt-2 text-xs text-rose-600 font-bold">{weightError}</p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              Total: {displayAWeight + displayQWeight}%
              {displayAWeight + displayQWeight !== 100 && (
                <span className="text-rose-500 ml-1">≠ 100</span>
              )}
            </span>
            <button
              onClick={() => void saveWeights()}
              disabled={isSavingWeights || displayAWeight + displayQWeight !== 100}
              className="rounded-xl bg-slate-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:bg-slate-300"
            >
              {isSavingWeights ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setFilterRisk((v) => !v)}
          className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold transition ${
            filterRisk
              ? "border-rose-300 bg-rose-50 text-rose-700"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {filterRisk ? "Showing at-risk only" : "Filter: at-risk"}
        </button>
        <Link
          href={`/teacher/marking`}
          className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
        >
          Go to Marking Portal →
        </Link>
      </div>

      {/* Gradebook table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th
                  className="cursor-pointer px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition"
                  onClick={() => toggleSort("name")}
                >
                  Student <SortIcon k="name" />
                </th>
                <th
                  className="cursor-pointer px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition"
                  onClick={() => toggleSort("assignment")}
                >
                  Assignments <SortIcon k="assignment" />
                </th>
                <th
                  className="cursor-pointer px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition"
                  onClick={() => toggleSort("quiz")}
                >
                  Quizzes/Tests <SortIcon k="quiz" />
                </th>
                <th
                  className="cursor-pointer px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition"
                  onClick={() => toggleSort("final")}
                >
                  Weighted Final <SortIcon k="final" />
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Level
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    {filterRisk ? "No at-risk students found." : "No students enrolled."}
                  </td>
                </tr>
              )}
              {sorted.map((student) => {
                const final = student.weightedAverage;
                const level = nscLevel(final);
                const isAtRisk = typeof final === "number" && final < 50;
                const isCritical = typeof final === "number" && final < 40;

                return (
                  <tr
                    key={String(student.userId)}
                    className={`transition ${
                      isCritical
                        ? "bg-rose-50/40 hover:bg-rose-50"
                        : isAtRisk
                        ? "bg-amber-50/30 hover:bg-amber-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                            isCritical
                              ? "bg-rose-100 text-rose-700"
                              : isAtRisk
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {student.fullName?.[0] ?? "?"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{student.fullName}</p>
                          {(isAtRisk || isCritical) && (
                            <p className={`flex items-center gap-1 text-[10px] font-black ${isCritical ? "text-rose-600" : "text-amber-600"}`}>
                              <AlertTriangle className="h-3 w-3" />
                              {isCritical ? "Critical" : "At risk"}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <MiniBar value={student.assignmentPercent} />
                    </td>

                    <td className="px-6 py-4 text-center">
                      <MiniBar value={student.quizPercent} />
                    </td>

                    <td className="px-6 py-4 text-center">
                      <p
                        className={`text-lg font-black ${
                          isCritical
                            ? "text-rose-700"
                            : isAtRisk
                            ? "text-amber-700"
                            : typeof final === "number"
                            ? "text-slate-950"
                            : "text-slate-300"
                        }`}
                      >
                        {typeof final === "number" ? `${Math.round(final)}%` : "—"}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-black ${level.bg} ${level.text}`}
                      >
                        {level.label}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${
                          student.isPublished
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {student.isPublished ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Published
                          </>
                        ) : (
                          "Draft"
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/teacher/reports/${courseId}`}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Open Full Report & Publish Marks
        </Link>
        <Link
          href={`/teacher/marking`}
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-950"
        >
          Go to Marking Portal
        </Link>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        accent
          ? "border-rose-200 bg-rose-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-[10px] font-black uppercase tracking-widest ${accent ? "text-rose-500" : "text-slate-400"}`}>
        {label}
      </p>
      <p className={`mt-2 text-3xl font-black ${accent ? "text-rose-700" : "text-slate-950"}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

function MiniBar({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-xs text-slate-300">—</span>;
  const isLow = value < 50;
  const isMid = value >= 50 && value < 70;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-sm font-bold ${isLow ? "text-rose-600" : isMid ? "text-amber-600" : "text-emerald-700"}`}>
        {Math.round(value)}%
      </span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-1.5 rounded-full ${isLow ? "bg-rose-400" : isMid ? "bg-amber-400" : "bg-emerald-500"}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

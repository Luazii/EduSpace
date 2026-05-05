"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ClipboardPenLine, CheckCircle2 } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function ManualMarkCapture() {
  const courses = useQuery(api.manualMarks.listMyCourses) ?? [];
  const [courseId, setCourseId] = useState<string>("");
  const students = useQuery(api.manualMarks.listStudentsByCourse, courseId ? { courseId: courseId as Id<"courses"> } : "skip") ?? [];
  const marks = useQuery(api.manualMarks.listMarksForCourse, courseId ? { courseId: courseId as Id<"courses"> } : "skip") ?? [];
  const captureMark = useMutation(api.manualMarks.captureMark);

  const [studentUserId, setStudentUserId] = useState("");
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentType, setAssessmentType] = useState<"test" | "exam" | "assignment" | "classwork" | "project">("test");
  const [termLabel, setTermLabel] = useState("");
  const [maxMark, setMaxMark] = useState("100");
  const [mark, setMark] = useState("");
  const [comment, setComment] = useState("");

  const selectedCourse = useMemo(() => courses.find((course) => course._id === courseId), [courses, courseId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseId || !studentUserId) return;
    await captureMark({
      courseId: courseId as Id<"courses">,
      studentUserId: studentUserId as Id<"users">,
      assessmentName,
      assessmentType,
      termLabel: termLabel || undefined,
      maxMark: Number(maxMark),
      mark: Number(mark),
      comment: comment || undefined,
    });
    setAssessmentName("");
    setMark("");
    setComment("");
  }

  return (
    <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={onSubmit} className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm h-fit">
        <header className="mb-6 flex items-center gap-3">
          <ClipboardPenLine className="h-5 w-5 text-sky-600" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Capture Marks</p>
            <h2 className="text-2xl font-black text-slate-950">Manual subject assessment entry</h2>
          </div>
        </header>
        <div className="grid gap-4">
          <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setStudentUserId(""); }} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
            <option value="">Select subject</option>
            {courses.map((course) => <option key={course._id} value={course._id}>{course.courseName} ({course.courseCode})</option>)}
          </select>
          <select value={studentUserId} onChange={(e) => setStudentUserId(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
            <option value="">Select learner</option>
            {students.map((entry) => entry.student ? <option key={entry.student._id} value={entry.student._id}>{entry.student.fullName ?? entry.student.email}</option> : null)}
          </select>
          <input value={assessmentName} onChange={(e) => setAssessmentName(e.target.value)} placeholder="Assessment name" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
          <div className="grid grid-cols-2 gap-4">
            <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value as typeof assessmentType)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
              <option value="test">Test</option>
              <option value="exam">Exam</option>
              <option value="assignment">Assignment</option>
              <option value="classwork">Classwork</option>
              <option value="project">Project</option>
            </select>
            <input value={termLabel} onChange={(e) => setTermLabel(e.target.value)} placeholder="Term 1" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="number" value={maxMark} onChange={(e) => setMaxMark(e.target.value)} placeholder="Maximum mark" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
            <input type="number" value={mark} onChange={(e) => setMark(e.target.value)} placeholder="Learner mark" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Teacher comment" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
          <button className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-sm font-black uppercase tracking-widest text-white">
            <CheckCircle2 className="h-4 w-4" /> Save academic record
          </button>
        </div>
      </form>

      <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Academic Record</p>
          <h2 className="text-2xl font-black text-slate-950">{selectedCourse?.courseName ?? "Select a subject"}</h2>
        </header>
        <div className="grid gap-4">
          {marks.length === 0 ? (
            <p className="text-sm text-slate-500">No manual marks have been captured for this subject yet.</p>
          ) : (
            marks.map((entry) => (
              <article key={entry._id} className="rounded-3xl border border-slate-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-950">{entry.student?.fullName ?? entry.student?.email}</h3>
                    <p className="text-sm text-slate-500">{entry.assessmentName} · {entry.assessmentType} {entry.termLabel ? `· ${entry.termLabel}` : ""}</p>
                    <p className="mt-2 text-xs text-slate-400">{entry.comment ?? "No comment recorded."}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-950">{entry.mark}/{entry.maxMark}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-700">{Math.round((entry.mark / entry.maxMark) * 100)}%</p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}

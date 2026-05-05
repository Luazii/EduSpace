"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Users, UserPlus, X, Check, Trash2 } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function ClassManager() {
  const classes = useQuery(api.classes.list) ?? [];
  const students = useQuery(api.classes.listStudents) ?? [];
  const teachers = useQuery(api.users.list)?.filter((user) => user.role === "teacher") ?? [];

  const createClass = useMutation(api.classes.create);
  const updateClass = useMutation(api.classes.update);
  const assignStudent = useMutation(api.classes.assignStudent);
  const removeStudent = useMutation(api.classes.removeStudent);

  const [editingId, setEditingId] = useState<Id<"classes"> | null>(null);
  const [name, setName] = useState("");
  const [gradeName, setGradeName] = useState("");
  const [academicYear, setAcademicYear] = useState("2026");
  const [capacity, setCapacity] = useState("35");
  const [teacherId, setTeacherId] = useState("");
  const [assignClassId, setAssignClassId] = useState<string>("");
  const [assignStudentId, setAssignStudentId] = useState<string>("");
  const [activeRosterClassId, setActiveRosterClassId] = useState<Id<"classes"> | null>(null);

  const activeRoster = useQuery(
    api.classes.getRoster,
    activeRosterClassId ? { classId: activeRosterClassId } : "skip",
  );

  function resetForm() {
    setEditingId(null);
    setName("");
    setGradeName("");
    setAcademicYear("2026");
    setCapacity("35");
    setTeacherId("");
  }

  function startEdit(schoolClass: (typeof classes)[number]) {
    setEditingId(schoolClass._id);
    setName(schoolClass.name);
    setGradeName(schoolClass.gradeName);
    setAcademicYear(schoolClass.academicYear);
    setCapacity(String(schoolClass.capacity));
    setTeacherId(schoolClass.classTeacherUserId ?? "");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      name: name.trim(),
      gradeName: gradeName.trim(),
      academicYear: academicYear.trim(),
      capacity: Number(capacity),
      classTeacherUserId: teacherId ? (teacherId as Id<"users">) : undefined,
    };

    if (editingId) {
      await updateClass({ classId: editingId, ...payload, isActive: true });
    } else {
      await createClass(payload);
    }

    resetForm();
  }

  async function onAssignStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignClassId || !assignStudentId) return;
    await assignStudent({
      classId: assignClassId as Id<"classes">,
      studentUserId: assignStudentId as Id<"users">,
    });
    setAssignStudentId("");
  }

  return (
    <section className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-8">
        <form onSubmit={onSubmit} className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Class Setup</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {editingId ? "Edit class" : "Create class"}
              </h2>
            </div>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-xl p-2 hover:bg-slate-50">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            )}
          </header>

          <div className="grid gap-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grade 10 A" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none" />
            <input value={gradeName} onChange={(e) => setGradeName(e.target.value)} placeholder="Grade 10" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none" />
            <div className="grid grid-cols-2 gap-4">
              <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2026" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none" />
              <input value={capacity} onChange={(e) => setCapacity(e.target.value)} type="number" min="1" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none" />
            </div>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none">
              <option value="">No class teacher yet</option>
              {teachers.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>{teacher.fullName ?? teacher.email}</option>
              ))}
            </select>
            <button className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-sm font-black uppercase tracking-widest text-white">
              <Check className="h-4 w-4" />
              {editingId ? "Update class" : "Create class"}
            </button>
          </div>
        </form>

        <form onSubmit={onAssignStudent} className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Student Assignment</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Assign learner to class</h2>
          </header>
          <div className="grid gap-4">
            <select value={assignClassId} onChange={(e) => { setAssignClassId(e.target.value); setActiveRosterClassId(e.target.value as Id<"classes">); }} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none">
              <option value="">Select class</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass._id} value={schoolClass._id}>
                  {schoolClass.name} · {schoolClass.gradeName} ({schoolClass.assignedCount}/{schoolClass.capacity})
                </option>
              ))}
            </select>
            <select value={assignStudentId} onChange={(e) => setAssignStudentId(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none">
              <option value="">Select learner</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.fullName ?? student.email}{student.currentClass ? ` · currently ${student.currentClass.name}` : ""}
                </option>
              ))}
            </select>
            <button className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 py-4 text-sm font-black uppercase tracking-widest text-white">
              <UserPlus className="h-4 w-4" /> Assign to class
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-8">
        <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="mb-6 flex items-center gap-3">
            <Users className="h-5 w-5 text-sky-600" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Class Register</p>
              <h2 className="text-2xl font-black text-slate-950">Current classes</h2>
            </div>
          </header>
          <div className="grid gap-4">
            {classes.map((schoolClass) => (
              <article key={schoolClass._id} className="rounded-3xl border border-slate-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{schoolClass.name}</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{schoolClass.gradeName} · {schoolClass.academicYear}</p>
                    <p className="mt-2 text-sm text-slate-500">Teacher: {schoolClass.teacher?.fullName ?? schoolClass.teacher?.email ?? "Unassigned"}</p>
                  </div>
                  <div className="text-right text-sm font-bold text-slate-500">
                    <p>{schoolClass.assignedCount}/{schoolClass.capacity}</p>
                    <p className="text-xs text-slate-400">{schoolClass.remainingCapacity} seats left</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => startEdit(schoolClass)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Edit</button>
                  <button onClick={() => setActiveRosterClassId(schoolClass._id)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-sky-700">View roster</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {activeRoster && (
          <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
            <header className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Roster</p>
              <h2 className="text-2xl font-black text-slate-950">{activeRoster.name}</h2>
            </header>
            <div className="grid gap-3">
              {activeRoster.students.length === 0 ? (
                <p className="text-sm text-slate-500">No learners assigned yet.</p>
              ) : (
                activeRoster.students.map((entry) => {
                  if (!entry) return null;
                  return (
                    <div key={entry.assignmentId} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-950">{entry.student.fullName ?? entry.student.email}</p>
                        <p className="text-xs text-slate-400">{entry.student.email}</p>
                      </div>
                      <button onClick={() => removeStudent({ assignmentId: entry.assignmentId })} className="rounded-xl border border-rose-200 p-2 text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

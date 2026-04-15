"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Trash2, Edit3, Plus, X, Check } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export function QualificationManager() {
  const qualifications = useQuery(api.qualifications.list) ?? [];
  const faculties = useQuery(api.faculties.list) ?? [];
  const createQualification = useMutation(api.qualifications.create);
  const updateQualification = useMutation(api.qualifications.update);
  const removeQualification = useMutation(api.qualifications.remove);

  const [editingId, setEditingId] = useState<Id<"qualifications"> | null>(null);
  const [facultyId, setFacultyId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setFacultyId("");
    setName("");
    setCode("");
    setDescription("");
  };

  const startEdit = (q: any) => {
    setEditingId(q._id);
    setFacultyId(q.facultyId);
    setName(q.name);
    setCode(q.code || "");
    setDescription(q.description || "");
  };

  const handleDelete = async (id: Id<"qualifications">) => {
    if (!confirm("Are you sure? This will affect all subjects linked to this curriculum.")) return;
    await removeQualification({ id });
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !facultyId) return;

    setIsSaving(true);
    try {
      if (editingId) {
        await updateQualification({
          id: editingId,
          facultyId: facultyId as Id<"faculties">,
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
        });
      } else {
        await createQualification({
          facultyId: facultyId as Id<"faculties">,
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
        });
      }
      resetForm();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      {/* Creation/Edit Form */}
      <form
        onSubmit={onSubmit}
        className="h-fit rounded-4xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 mb-2">
              {editingId ? "Curriculum Standard Update" : "Curriculum Definition"}
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              {editingId ? "Edit Curriculum" : "Add Curriculum"}
            </h2>
          </div>
          {editingId && (
            <button 
              type="button" 
              onClick={resetForm}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 transition"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="grid gap-6">
          <label className="grid gap-2 text-sm font-bold text-slate-900">
            Grade Level
            <select
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 appearance-none"
            >
              <option value="">Select Grade Level</option>
              {faculties.map((f) => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-900">
            Curriculum Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="National Senior Certificate (NSC)"
              className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-900">
            Curriculum Code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="NSC"
              className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-900">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary learning outcomes or career paths..."
              rows={4}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
            />
          </label>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : editingId ? "Update Curriculum Record" : "Register Curriculum"}
            {!isSaving && (editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
          </button>
        </div>
      </form>

      {/* Registry List */}
      <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 mb-2">Academic Standards</p>
          <h2 className="text-2xl font-black text-slate-950">Curriculum Registry</h2>
          <p className="mt-2 text-sm text-slate-500">{qualifications.length} standards currently approved for enrollment.</p>
        </header>

        <div className="grid gap-4">
          {qualifications.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-100 p-12 text-center text-slate-400">
              No entries found.
            </div>
          ) : (
            qualifications.map((q) => (
              <article
                key={q._id}
                className="group relative rounded-3xl border border-slate-100 bg-slate-50/30 p-6 transition hover:bg-white hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 uppercase">{q.code || "N/A"}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{q.courseCount || 0} Subjects</span>
                      {q.faculty && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{q.faculty.name}</span>}
                    </div>
                    <h3 className="text-lg font-bold text-slate-950">{q.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button 
                      onClick={() => startEdit(q)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 hover:text-sky-600 hover:border-sky-200 transition"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(q._id)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {q.description && (
                  <p className="mt-4 text-sm leading-7 text-slate-500 line-clamp-2">
                    {q.description}
                  </p>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

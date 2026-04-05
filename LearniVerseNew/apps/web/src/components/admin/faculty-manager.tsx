"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Trash2, Edit3, Plus, X, Check } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export function FacultyManager() {
  const faculties = useQuery(api.faculties.list) ?? [];
  const createFaculty = useMutation(api.faculties.create);
  const updateFaculty = useMutation(api.faculties.update);
  const removeFaculty = useMutation(api.faculties.remove);

  const [editingId, setEditingId] = useState<Id<"faculties"> | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCode("");
    setDescription("");
  };

  const startEdit = (faculty: any) => {
    setEditingId(faculty._id);
    setName(faculty.name);
    setCode(faculty.code || "");
    setDescription(faculty.description || "");
  };

  const handleDelete = async (id: Id<"faculties">) => {
    if (!confirm("Are you sure? Deleting this faculty may affect linked qualifications and courses.")) return;
    await removeFaculty({ id });
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      if (editingId) {
        await updateFaculty({
          id: editingId,
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
        });
      } else {
        await createFaculty({
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
              {editingId ? "Academic Standard Update" : "Curriculum Definition"}
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              {editingId ? "Edit Faculty" : "Add Faculty"}
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
            Faculty Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Faculty of Engineering & Built Environment"
              className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-900">
            Faculty Code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ENG"
              className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-900">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Historical background or academic goals..."
              rows={4}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
            />
          </label>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : editingId ? "Update Faculty Record" : "Create Faculty"}
            {!isSaving && (editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
          </button>
        </div>
      </form>

      {/* Registry List */}
      <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600 mb-2">Faculty Records</p>
          <h2 className="text-2xl font-black text-slate-950">Faculty Registry</h2>
          <p className="mt-2 text-sm text-slate-500">{faculties.length} departments currently on-boarded.</p>
        </header>

        <div className="grid gap-4">
          {faculties.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-100 p-12 text-center text-slate-400">
              No entries found.
            </div>
          ) : (
            faculties.map((faculty) => (
              <article
                key={faculty._id}
                className="group relative rounded-3xl border border-slate-100 bg-slate-50/30 p-6 transition hover:bg-white hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className="rounded-lg bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-700 uppercase">{faculty.code || "N/A"}</span>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{faculty.qualificationCount || 0} Quals</span>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{faculty.courseCount || 0} Courses</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-950">{faculty.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button 
                      onClick={() => startEdit(faculty)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 hover:text-sky-600 hover:border-sky-200 transition"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(faculty._id)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {faculty.description && (
                  <p className="mt-4 text-sm leading-7 text-slate-500 line-clamp-2">
                    {faculty.description}
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

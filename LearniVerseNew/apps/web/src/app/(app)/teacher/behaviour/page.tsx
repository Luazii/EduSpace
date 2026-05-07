"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ShieldCheck, ShieldAlert, Award, AlertCircle, Save, CheckCircle2 } from "lucide-react";

const MERIT_CATEGORIES = ["Helpfulness", "Academic Excellence", "Leadership", "Sportsmanship", "Respect"];
const DEMERIT_CATEGORIES = ["Disruptive Behaviour", "Late Submission", "Truancy", "Disrespect", "Property Damage"];

export default function TeacherBehaviourPage() {
  const students = useQuery(api.behaviour.listMyStudents) ?? [];
  const awardRecord = useMutation(api.behaviour.awardRecord);

  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState<"merit" | "demerit">("merit");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const categories = type === "merit" ? MERIT_CATEGORIES : DEMERIT_CATEGORIES;

  const handleTypeChange = (newType: "merit" | "demerit") => {
    setType(newType);
    setCategory("");
    setPoints(newType === "merit" ? 1 : -1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || (!category && !customCategory) || !description) return;

    setSubmitting(true);
    try {
      await awardRecord({
        studentUserId: studentId as any,
        type,
        category: category === "other" ? customCategory : category,
        description,
        points,
      });

      // Show toast and reset form
      setShowToast(true);
      setStudentId("");
      setCategory("");
      setCustomCategory("");
      setDescription("");
      setPoints(type === "merit" ? 1 : -1);
      
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to save behaviour record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-10 border-b border-slate-100 pb-10">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7c4dff]">
          Conduct & Behaviour
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          Award Records
        </h1>
        <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
          Record positive merits and negative demerits for learners in your classes. 
          These records will appear on student reports and parent dashboards.
        </p>
      </header>

      <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Student Selection */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-950">
              Select Learner
            </label>
            <select
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none transition focus:border-[#7c4dff] focus:ring-4 focus:ring-[#7c4dff]/10"
            >
              <option value="">-- Choose a student --</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.fullName} ({s.email})
                </option>
              ))}
            </select>
          </div>

          {/* Record Type Toggle */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-950">
              Record Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange("merit")}
                className={`flex items-center justify-center gap-3 rounded-2xl border-2 p-4 font-bold transition ${
                  type === "merit"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                }`}
              >
                <ShieldCheck className="h-5 w-5" />
                Merit
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("demerit")}
                className={`flex items-center justify-center gap-3 rounded-2xl border-2 p-4 font-bold transition ${
                  type === "demerit"
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                }`}
              >
                <ShieldAlert className="h-5 w-5" />
                Demerit
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-950">
                Category
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none transition focus:border-[#7c4dff] focus:ring-4 focus:ring-[#7c4dff]/10"
              >
                <option value="">-- Choose category --</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="other">Other (Specify)</option>
              </select>
              
              {category === "other" && (
                <input
                  type="text"
                  required
                  placeholder="Specify custom category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none transition focus:border-[#7c4dff] focus:ring-4 focus:ring-[#7c4dff]/10"
                />
              )}
            </div>

            {/* Points */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-950">
                Points {type === "demerit" && "(Negative)"}
              </label>
              <input
                type="number"
                required
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none transition focus:border-[#7c4dff] focus:ring-4 focus:ring-[#7c4dff]/10"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-950">
              Description / Notes
            </label>
            <textarea
              required
              rows={3}
              placeholder="Provide context for this behaviour record..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none transition focus:border-[#7c4dff] focus:ring-4 focus:ring-[#7c4dff]/10"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-8">
            {showToast ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                Record saved successfully
              </div>
            ) : (
              <div />
            )}
            
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition ${
                submitting 
                  ? "bg-slate-300" 
                  : type === "merit" 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              <Save className="h-5 w-5" />
              {submitting ? "Saving..." : `Award ${type}`}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

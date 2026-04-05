"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface CourseSettingsPanelProps {
  course: {
    _id: Id<"courses">;
    courseCode: string;
    courseName: string;
    assignmentWeight?: number;
    quizWeight?: number;
  };
}

export function CourseSettingsPanel({ course }: CourseSettingsPanelProps) {
  const [assignmentWeight, setAssignmentWeight] = useState(course.assignmentWeight ?? 50);
  const [quizWeight, setQuizWeight] = useState(course.quizWeight ?? 50);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const updateWeights = useMutation(api.courses.updateWeights);

  const handleAssignmentChange = (value: number) => {
    setAssignmentWeight(value);
    setQuizWeight(100 - value);
  };

  const handleQuizChange = (value: number) => {
    setQuizWeight(value);
    setAssignmentWeight(100 - value);
  };

  const onSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await updateWeights({
        courseId: course._id,
        assignmentWeight,
        quizWeight,
      });
      setMessage({ type: "success", text: "Weightings updated successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to update weights" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-4xl border border-slate-200 bg-white/70 p-8 shadow-[0_22px_70px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-700">
            Course Settings
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Grading Weighting
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Define how assignments and quizzes contribute to the final mark for {course.courseCode}.
          </p>
        </div>

        <div className="grid gap-8 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Assignments</label>
              <span className="text-sm font-bold text-sky-700">{assignmentWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={assignmentWeight}
              onChange={(e) => handleAssignmentChange(parseInt(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-sky-600"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Quizzes</label>
              <span className="text-sm font-bold text-sky-700">{quizWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={quizWeight}
              onChange={(e) => handleQuizChange(parseInt(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-sky-600"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 italic">
            Total weighting must equal 100%
          </p>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="rounded-full bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400"
          >
            {isSaving ? "Saving..." : "Save Weightings"}
          </button>
        </div>

        {message && (
          <p className={`mt-4 text-center text-sm font-medium ${
            message.type === "success" ? "text-emerald-600" : "text-rose-600"
          }`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}

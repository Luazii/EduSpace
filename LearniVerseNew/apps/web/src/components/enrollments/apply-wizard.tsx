"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";

import { api } from "../../../convex/_generated/api";
import { CheckoutButton } from "@/components/payments/checkout-button";

type SubjectEntry = {
  name: string;
  mark: string;
};

export function ApplyWizard() {
  const faculties = useQuery(api.faculties.list) ?? [];
  const qualifications = useQuery(api.qualifications.list) ?? [];
  const courses = useQuery(api.courses.list, {}) ?? [];
  const applications = useQuery(api.enrollments.listMine) ?? [];
  const saveDraft = useMutation(api.enrollments.saveDraft);
  const generateNscUploadUrl = useMutation(api.enrollments.generateNscUploadUrl);
  const submitApplication = useMutation(api.enrollments.submitApplication);

  const [step, setStep] = useState(1);
  const [facultyId, setFacultyId] = useState("");
  const [qualificationId, setQualificationId] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [nscFile, setNscFile] = useState<File | null>(null);
  const [subjects, setSubjects] = useState<SubjectEntry[]>([
    { name: "", mark: "" },
    { name: "", mark: "" },
  ]);
  
  // New Personal Details State
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApplicationId, setSubmittedApplicationId] = useState<string | null>(null);

  const filteredQualifications = qualifications.filter((qualification) =>
    facultyId ? qualification.facultyId === facultyId : true,
  );

  const filteredCourses = courses.filter((course) =>
    qualificationId ? course.qualificationId === qualificationId : true,
  );

  const selectedCourses = courses.filter((course) =>
    selectedCourseIds.includes(course._id),
  );

  async function onSaveDraft() {
    if (!facultyId || !qualificationId) return;
    setIsSavingDraft(true);
    try {
      await saveDraft({
        facultyId: facultyId as Id<"faculties">,
        qualificationId: qualificationId as Id<"qualifications">,
        selectedCourseIds: selectedCourseIds as Array<Id<"courses">>,
        notes: notes.trim() || undefined,
      });
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedSubjects = subjects
      .map((subject) => ({
        name: subject.name.trim(),
        mark: Number(subject.mark),
      }))
      .filter((subject) => subject.name && Number.isFinite(subject.mark));

    if (!facultyId || !qualificationId || selectedCourseIds.length === 0 || !nscFile) return;

    setIsSubmitting(true);
    try {
      const uploadUrl = await generateNscUploadUrl({});
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": nscFile.type || "application/pdf" },
        body: nscFile,
      });

      const { storageId } = (await uploadResult.json()) as { storageId: Id<"_storage"> };

      const appId = await submitApplication({
        facultyId: facultyId as Id<"faculties">,
        qualificationId: qualificationId as Id<"qualifications">,
        selectedCourseIds: selectedCourseIds as Array<Id<"courses">>,
        notes: notes.trim() || undefined,
        nscStorageId: storageId,
        nscFileName: nscFile.name,
        subjects: cleanedSubjects,
        phone: phone.trim() || undefined,
        gender: gender || undefined,
        dob: dob ? new Date(dob).getTime() : undefined,
      });

      setSubmittedApplicationId(appId);
      setStep(6); // Success / Payment step
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8">
      <form
        onSubmit={onSubmit}
        className="rounded-4xl border border-slate-200 bg-white p-10 shadow-sm"
      >
        <div className="mb-10">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-700 mb-2">
            Admissions Portal
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-950">
            Student Enrollment Process
          </h1>
          <p className="mt-4 text-sm text-slate-500 leading-relaxed max-w-2xl">
            Please follow the institutional flow to register your academic profile. 
            Ensure your personal details and academic documentation are certified 
            before proceeding to payment.
          </p>
        </div>

        {step < 6 && (
          <div className="mb-10 flex flex-wrap gap-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black transition ${
                  step === item
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20"
                    : step > item 
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-50 text-slate-400"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-8">
          {step === 1 && (
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-900">
                Institutional Faculty
                <select
                  value={facultyId}
                  onChange={(event) => {
                    setFacultyId(event.target.value);
                    setQualificationId("");
                    setSelectedCourseIds([]);
                  }}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 appearance-none"
                >
                  <option value="">Select Department</option>
                  {faculties.map((faculty) => (
                    <option key={faculty._id} value={faculty._id}>{faculty.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-900">
                Target Qualification
                <select
                  value={qualificationId}
                  disabled={!facultyId}
                  onChange={(event) => {
                    setQualificationId(event.target.value);
                    setSelectedCourseIds([]);
                  }}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 appearance-none disabled:opacity-50"
                >
                  <option value="">Select Certificate/Degree</option>
                  {filteredQualifications.map((qualification) => (
                    <option key={qualification._id} value={qualification._id}>{qualification.name}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-bold text-slate-900">
                Contact Number
                <input
                  type="tel"
                  placeholder="+27..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-900">
                Date of Birth
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-900">
                Gender Identity
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 appearance-none"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-900">Curriculum Configuration</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredCourses.map((course) => (
                  <label
                    key={course._id}
                    className={`flex items-start gap-4 rounded-3xl border p-5 transition cursor-pointer ${
                      selectedCourseIds.includes(course._id)
                        ? "border-sky-500 bg-sky-50/30 ring-4 ring-sky-500/10"
                        : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 text-slate-400 font-bold"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 rounded-lg border-slate-300 text-sky-600 focus:ring-sky-500"
                      checked={selectedCourseIds.includes(course._id)}
                      onChange={(event) =>
                        setSelectedCourseIds((current) =>
                          event.target.checked
                            ? [...current, course._id]
                            : current.filter((value) => value !== course._id),
                        )
                      }
                    />
                    <div className={selectedCourseIds.includes(course._id) ? "text-slate-900" : "text-slate-400 font-normal italic"}>
                      <p className="text-sm font-black">
                        {course.courseCode} · {course.courseName}
                      </p>
                      <p className="mt-1 text-xs">{course.department}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-8">
              <label className="grid gap-3 text-sm font-bold text-slate-900">
                NSC Academic Record (PDF/Image)
                <div className="relative group">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => setNscFile(event.target.files?.[0] ?? null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 group-hover:border-sky-300 group-hover:bg-sky-50/30 p-10 text-center transition">
                    <p className="text-sm font-bold text-slate-600">
                      {nscFile ? nscFile.name : "Click or drag to upload NSC documentation"}
                    </p>
                  </div>
                </div>
              </label>
              
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">Subject-Level Marks</p>
                  <button
                    type="button"
                    onClick={() => setSubjects((current) => [...current, { name: "", mark: "" }])}
                    className="text-xs font-black uppercase tracking-widest text-sky-600 hover:text-sky-700"
                  >
                    + Add Subject
                  </button>
                </div>
                <div className="grid gap-3">
                  {subjects.map((subject, index) => (
                    <div key={index} className="grid gap-3 sm:grid-cols-[1fr_120px]">
                      <input
                        value={subject.name}
                        onChange={(event) =>
                          setSubjects((current) =>
                            current.map((item, i) => i === index ? { ...item, name: event.target.value } : item)
                          )
                        }
                        placeholder="Subject name"
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3 text-sm outline-none transition focus:border-sky-500"
                      />
                      <input
                        type="number"
                        min="0" max="100"
                        value={subject.mark}
                        onChange={(event) =>
                          setSubjects((current) =>
                            current.map((item, i) => i === index ? { ...item, mark: event.target.value } : item)
                          )
                        }
                        placeholder="Mark %"
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3 text-sm outline-none transition focus:border-sky-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-8">
              <div className="grid gap-4 rounded-4xl bg-slate-50 p-10 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Application Summary</h3>
                <div className="grid gap-6 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Target Faculty</p>
                    <p className="font-bold text-slate-950">{faculties.find(f => f._id === facultyId)?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Academic Level</p>
                    <p className="font-bold text-slate-950">{qualifications.find(q => q._id === qualificationId)?.name}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Curriculum Selection</p>
                    <p className="font-bold text-slate-950">{selectedCourses.map(c => c.courseName).join(", ")}</p>
                  </div>
                </div>
              </div>
              <label className="grid gap-2 text-sm font-bold text-slate-900">
                Supporting Institutional Information
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="Provide additional context for the Office of the Registrar..."
                  className="rounded-3xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm outline-none transition focus:border-sky-500"
                />
              </label>
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-6">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-black text-slate-950 mb-4">Application Submitted</h2>
              <p className="text-slate-500 max-w-md leading-relaxed mb-10">
                Your admissions record has been formally recorded. To finalize your enrollment and trigger institutional review, please settle the administrative fees.
              </p>
              {submittedApplicationId && (
                <div className="transform scale-125">
                  <CheckoutButton applicationId={submittedApplicationId} />
                </div>
              )}
              <button 
                type="button"
                onClick={() => window.location.reload()}
                className="mt-12 text-sm font-bold text-slate-400 hover:text-slate-600"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>

        {step < 6 && (
          <div className="mt-12 flex flex-wrap items-center justify-between border-t border-slate-100 pt-10">
            <div className="flex gap-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((current) => current - 1)}
                  className="rounded-2xl border border-slate-200 px-8 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Previous
                </button>
              )}
              <button
                type="button"
                onClick={() => void onSaveDraft()}
                disabled={isSavingDraft || !facultyId || !qualificationId}
                className="text-sm font-bold text-sky-600 hover:text-sky-700 disabled:opacity-30"
              >
                {isSavingDraft ? "Saving Draft..." : "Save Draft"}
              </button>
            </div>

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((current) => current + 1)}
                className="rounded-2xl bg-slate-950 px-10 py-4 text-sm font-bold text-white shadow-xl shadow-slate-950/20 hover:bg-slate-800 transition"
              >
                Institutional Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-[#7c4dff] px-10 py-4 text-sm font-bold text-white shadow-xl shadow-[#7c4dff]/20 hover:bg-[#6c3bed] transition disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Confirm & Submit Application"}
              </button>
            )}
          </div>
        )}
      </form>

      {/* Registry Section stays mostly the same but updated labels */}
      <section className="rounded-4xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-700 mb-2">Personal Admissions Record</p>
        <h2 className="text-3xl font-black text-slate-950 mb-8">Academic Application History</h2>
        <div className="grid gap-6">
          {applications.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-100 p-12 text-center text-slate-400">
              No formal application records found.
            </div>
          ) : (
            applications.map((app) => (
              <article key={app._id} className="rounded-3xl border border-slate-100 p-8 hover:border-sky-100 transition hover:bg-sky-50/10">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-950">{app.qualification?.name}</h3>
                    <p className="text-sm text-slate-500">{app.faculty?.name}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <span className={`rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest ${
                        app.status === "submitted" ? "bg-sky-50 text-sky-700" :
                        app.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                        "bg-rose-50 text-rose-700"
                      }`}>
                        {app.status}
                      </span>
                      <span className={`rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest ${
                        app.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"
                      }`}>
                        Payment: {app.paymentStatus}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-950 mb-3">R {app.totalAmount.toFixed(2)}</p>
                    {app.paymentStatus !== "paid" && <CheckoutButton applicationId={app._id} />}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

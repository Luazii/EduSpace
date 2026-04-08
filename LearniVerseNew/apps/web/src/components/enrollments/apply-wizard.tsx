"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";

import { api } from "../../../convex/_generated/api";
import { CheckoutButton } from "@/components/payments/checkout-button";

type DocFile = File | null;

const STEPS = ["Grade", "Personal", "Subjects", "Documents", "Review"];

const REQUIRED_DOCS: { key: keyof DocState; label: string; hint: string; required: boolean }[] = [
  { key: "birthCert", label: "Birth Certificate / Learner ID", hint: "Certified copy of the learner's birth certificate or ID document", required: true },
  { key: "parentId", label: "Parent / Guardian ID", hint: "Certified copy of parent or guardian's South African ID", required: true },
  { key: "proofOfResidence", label: "Proof of Residence", hint: "Utility bill, affidavit or lease agreement (not older than 3 months)", required: true },
  { key: "schoolReport", label: "Latest School Report", hint: "Most recent report card or academic transcript from previous school", required: true },
  { key: "transferLetter", label: "Transfer Letter / Card", hint: "Required if transferring from another school", required: false },
];

type DocState = {
  birthCert: DocFile;
  parentId: DocFile;
  proofOfResidence: DocFile;
  schoolReport: DocFile;
  transferLetter: DocFile;
};

export function ApplyWizard() {
  const grades = useQuery(api.qualifications.list) ?? [];
  const courses = useQuery(api.courses.list, {}) ?? [];
  const applications = useQuery(api.enrollments.listMine) ?? [];
  const saveDraft = useMutation(api.enrollments.saveDraft);
  const generateUploadUrl = useMutation(api.enrollments.generateNscUploadUrl);
  const submitApplication = useMutation(api.enrollments.submitApplication);

  const [step, setStep] = useState(1);
  const [gradeId, setGradeId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [docs, setDocs] = useState<DocState>({
    birthCert: null,
    parentId: null,
    proofOfResidence: null,
    schoolReport: null,
    transferLetter: null,
  });
  const [notes, setNotes] = useState("");

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApplicationId, setSubmittedApplicationId] = useState<string | null>(null);

  const subjectsForGrade = courses.filter((c) =>
    gradeId ? c.qualificationId === gradeId : true,
  );
  const selectedSubjects = courses.filter((c) => selectedSubjectIds.includes(c._id));
  const selectedGrade = grades.find((g) => g._id === gradeId);

  async function uploadFile(file: File): Promise<Id<"_storage">> {
    const url = await generateUploadUrl({});
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    return storageId;
  }

  async function onSaveDraft() {
    if (!gradeId) return;
    setIsSavingDraft(true);
    try {
      await saveDraft({
        qualificationId: gradeId as Id<"qualifications">,
        selectedCourseIds: selectedSubjectIds as Array<Id<"courses">>,
        notes: notes.trim() || undefined,
      });
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gradeId || selectedSubjectIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const [
        birthCertStorageId,
        parentIdStorageId,
        proofOfResidenceStorageId,
        schoolReportStorageId,
        transferLetterStorageId,
      ] = await Promise.all([
        docs.birthCert ? uploadFile(docs.birthCert) : Promise.resolve(undefined),
        docs.parentId ? uploadFile(docs.parentId) : Promise.resolve(undefined),
        docs.proofOfResidence ? uploadFile(docs.proofOfResidence) : Promise.resolve(undefined),
        docs.schoolReport ? uploadFile(docs.schoolReport) : Promise.resolve(undefined),
        docs.transferLetter ? uploadFile(docs.transferLetter) : Promise.resolve(undefined),
      ]);

      const appId = await submitApplication({
        qualificationId: gradeId as Id<"qualifications">,
        selectedCourseIds: selectedSubjectIds as Array<Id<"courses">>,
        notes: notes.trim() || undefined,
        phone: phone.trim() || undefined,
        gender: gender || undefined,
        dob: dob ? new Date(dob).getTime() : undefined,
        birthCertStorageId,
        parentIdStorageId,
        proofOfResidenceStorageId,
        schoolReportStorageId,
        transferLetterStorageId,
      });

      setSubmittedApplicationId(appId);
      setStep(6);
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
            High School Registration
          </h1>
          <p className="mt-4 text-sm text-slate-500 leading-relaxed max-w-2xl">
            Complete all steps to apply for enrolment. Ensure your personal
            details and supporting documents are ready before you begin.
          </p>
        </div>

        {step < 6 && (
          <div className="mb-10 flex flex-wrap gap-3">
            {STEPS.map((label, i) => {
              const n = i + 1;
              return (
                <div key={n} className="flex items-center gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black transition ${
                      step === n
                        ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20"
                        : step > n
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-50 text-slate-400"
                    }`}
                  >
                    {step > n ? "✓" : n}
                  </div>
                  <span className={`hidden sm:block text-xs font-bold ${step === n ? "text-slate-900" : "text-slate-400"}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid gap-8">
          {/* Step 1 — Grade Selection */}
          {step === 1 && (
            <div className="grid gap-6">
              <p className="text-sm font-bold text-slate-900">Which grade are you applying for?</p>
              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-5">
                {grades.filter((g) => g.isActive).map((grade) => (
                  <button
                    key={grade._id}
                    type="button"
                    onClick={() => {
                      setGradeId(grade._id);
                      setSelectedSubjectIds([]);
                    }}
                    className={`rounded-3xl border p-6 text-center transition ${
                      gradeId === grade._id
                        ? "border-sky-500 bg-sky-50 ring-4 ring-sky-500/10"
                        : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <p className={`text-lg font-black ${gradeId === grade._id ? "text-sky-700" : "text-slate-700"}`}>
                      {grade.name}
                    </p>
                    {grade.code && (
                      <p className="mt-1 text-xs text-slate-400">{grade.code}</p>
                    )}
                  </button>
                ))}
              </div>
              {grades.filter((g) => g.isActive).length === 0 && (
                <p className="text-sm text-slate-400 italic">No grades are currently available for registration. Please contact the school office.</p>
              )}
            </div>
          )}

          {/* Step 2 — Personal Details */}
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
                Gender
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 appearance-none"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
              </label>
            </div>
          )}

          {/* Step 3 — Subject Selection */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Select your subjects for {selectedGrade?.name ?? "this grade"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Choose all subjects you will be studying. Minimum of 6 subjects required.
                </p>
              </div>
              {subjectsForGrade.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  No subjects are linked to this grade yet. Please contact the school office.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {subjectsForGrade.map((subject) => (
                    <label
                      key={subject._id}
                      className={`flex items-start gap-4 rounded-3xl border p-5 transition cursor-pointer ${
                        selectedSubjectIds.includes(subject._id)
                          ? "border-sky-500 bg-sky-50/30 ring-4 ring-sky-500/10"
                          : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 rounded-lg border-slate-300 text-sky-600 focus:ring-sky-500"
                        checked={selectedSubjectIds.includes(subject._id)}
                        onChange={(e) =>
                          setSelectedSubjectIds((cur) =>
                            e.target.checked
                              ? [...cur, subject._id]
                              : cur.filter((id) => id !== subject._id),
                          )
                        }
                      />
                      <div>
                        <p className={`text-sm font-black ${selectedSubjectIds.includes(subject._id) ? "text-slate-900" : "text-slate-500"}`}>
                          {subject.courseName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">{subject.courseCode}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Document Uploads */}
          {step === 4 && (
            <div className="grid gap-6">
              <div>
                <p className="text-sm font-bold text-slate-900">Supporting Documents</p>
                <p className="mt-1 text-xs text-slate-400">
                  Upload certified copies of all required documents. Accepted formats: PDF, JPG, PNG.
                </p>
              </div>
              {REQUIRED_DOCS.map(({ key, label, hint, required }) => {
                const file = docs[key];
                return (
                  <label key={key} className="grid gap-2 text-sm font-bold text-slate-900 cursor-pointer">
                    <div className="flex items-center gap-2">
                      {label}
                      {required ? (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-rose-600">Required</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Optional</span>
                      )}
                    </div>
                    <p className="text-xs font-normal text-slate-400">{hint}</p>
                    <div className="relative group">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          setDocs((d) => ({ ...d, [key]: e.target.files?.[0] ?? null }))
                        }
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className={`rounded-3xl border-2 border-dashed p-6 text-center transition ${
                        file
                          ? "border-emerald-300 bg-emerald-50/50"
                          : "border-slate-200 bg-slate-50 group-hover:border-sky-300 group-hover:bg-sky-50/30"
                      }`}>
                        <p className={`text-sm font-bold ${file ? "text-emerald-700" : "text-slate-500"}`}>
                          {file ? `✓ ${file.name}` : "Click or drag to upload"}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {/* Step 5 — Review */}
          {step === 5 && (
            <div className="grid gap-8">
              <div className="rounded-4xl bg-slate-50 p-8 border border-slate-100 grid gap-6">
                <h3 className="text-lg font-bold text-slate-900">Application Summary</h3>
                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Grade Applying For</p>
                    <p className="font-bold text-slate-950">{selectedGrade?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Subjects Selected</p>
                    <p className="font-bold text-slate-950">{selectedSubjects.length} subject{selectedSubjects.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Subject List</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubjects.map((s) => (
                        <span key={s._id} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                          {s.courseName}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Documents Uploaded</p>
                    <div className="grid gap-1">
                      {REQUIRED_DOCS.map(({ key, label, required }) => {
                        const uploaded = !!docs[key];
                        return (
                          <div key={key} className="flex items-center gap-2 text-xs">
                            <span className={uploaded ? "text-emerald-600" : required ? "text-rose-500" : "text-slate-400"}>
                              {uploaded ? "✓" : required ? "✗" : "–"}
                            </span>
                            <span className={uploaded ? "text-slate-700" : required ? "text-rose-500 font-bold" : "text-slate-400"}>
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <label className="grid gap-2 text-sm font-bold text-slate-900">
                Additional Notes (optional)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Any additional information for the admissions office..."
                  className="rounded-3xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm outline-none transition focus:border-sky-500"
                />
              </label>
            </div>
          )}

          {/* Step 6 — Success */}
          {step === 6 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-6">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-black text-slate-950 mb-4">Application Submitted</h2>
              <p className="text-slate-500 max-w-md leading-relaxed mb-10">
                Your registration has been received and is pending review by the admissions
                office. To complete your enrolment, please pay the registration fee.
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
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-2xl border border-slate-200 px-8 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => void onSaveDraft()}
                disabled={isSavingDraft || !gradeId}
                className="text-sm font-bold text-sky-600 hover:text-sky-700 disabled:opacity-30"
              >
                {isSavingDraft ? "Saving..." : "Save Draft"}
              </button>
            </div>

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 && !gradeId}
                className="rounded-2xl bg-slate-950 px-10 py-4 text-sm font-bold text-white shadow-xl shadow-slate-950/20 hover:bg-slate-800 transition disabled:opacity-40"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !gradeId || selectedSubjectIds.length === 0}
                className="rounded-2xl bg-[#7c4dff] px-10 py-4 text-sm font-bold text-white shadow-xl shadow-[#7c4dff]/20 hover:bg-[#6c3bed] transition disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            )}
          </div>
        )}
      </form>

      {/* Application History */}
      <section className="rounded-4xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-700 mb-2">My Applications</p>
        <h2 className="text-3xl font-black text-slate-950 mb-8">Registration History</h2>
        <div className="grid gap-6">
          {applications.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-100 p-12 text-center text-slate-400">
              No applications on record.
            </div>
          ) : (
            applications.map((app) => (
              <article key={app._id} className="rounded-3xl border border-slate-100 p-8 hover:border-sky-100 transition hover:bg-sky-50/10">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-950">{app.qualification?.name}</h3>
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

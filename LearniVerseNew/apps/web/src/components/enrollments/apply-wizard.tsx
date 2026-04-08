"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { CheckoutButton } from "@/components/payments/checkout-button";

// ── Static high school grades ─────────────────────────────────────────────────
const HS_GRADES = ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

// ── South African High School Subject List ───────────────────────────────────
const SA_SUBJECTS: Record<string, string[]> = {
  "Home Language": [
    "English Home Language",
    "Afrikaans Home Language",
    "IsiZulu Home Language",
    "IsiXhosa Home Language",
    "Sesotho sa Leboa (Sepedi) Home Language",
    "Setswana Home Language",
    "Sesotho Home Language",
    "Xitsonga Home Language",
    "siSwati Home Language",
    "Tshivenda Home Language",
    "isiNdebele Home Language",
  ],
  "First Additional Language": [
    "English First Additional Language",
    "Afrikaans First Additional Language",
    "IsiZulu First Additional Language",
    "IsiXhosa First Additional Language",
    "Sesotho First Additional Language",
    "Setswana First Additional Language",
    "Xitsonga First Additional Language",
  ],
  "Mathematics": [
    "Mathematics",
    "Mathematical Literacy",
    "Technical Mathematics",
  ],
  "Sciences": [
    "Physical Sciences",
    "Life Sciences",
    "Agricultural Sciences",
    "Technical Sciences",
  ],
  "Technology": [
    "Engineering Graphics and Design (EGD)",
    "Information Technology (IT)",
    "Computer Applications Technology (CAT)",
    "Civil Technology",
    "Electrical Technology",
    "Mechanical Technology",
    "Agricultural Technology",
  ],
  "Commerce & Business": [
    "Accounting",
    "Business Studies",
    "Economics",
  ],
  "Humanities": [
    "History",
    "Geography",
    "Tourism",
    "Religion Studies",
  ],
  "Arts & Culture": [
    "Visual Arts",
    "Dramatic Arts",
    "Music",
    "Dance Studies",
  ],
  "Life Skills & Other": [
    "Life Orientation",
    "Consumer Studies",
    "Design",
    "Hospitality Studies",
    "Sport and Exercise Science",
  ],
};

const SENIOR_PHASE_SUBJECTS: Record<string, string[]> = {
  "Languages": [
    "English Home Language",
    "Afrikaans Home Language",
    "IsiZulu Home Language",
    "English First Additional Language",
    "Afrikaans First Additional Language",
  ],
  "Mathematics & Science": [
    "Mathematics",
    "Natural Sciences",
  ],
  "Humanities & Arts": [
    "Social Sciences",
    "Life Orientation",
    "Creative Arts",
  ],
  "Other": [
    "Economic and Management Sciences (EMS)",
    "Technology",
    "Information Technology (IT)",
    "Agricultural Sciences",
  ],
};

// ── Document config ───────────────────────────────────────────────────────────
type DocKey = "birthCert" | "parentId" | "proofOfResidence" | "schoolReport" | "transferLetter";
type DocState = Record<DocKey, File | null>;

const DOCS: { key: DocKey; label: string; hint: string; required: boolean }[] = [
  { key: "birthCert",         label: "Birth Certificate / Learner ID",  hint: "Certified copy of the learner's birth certificate or SA ID document",              required: true  },
  { key: "parentId",          label: "Parent / Guardian ID",            hint: "Certified copy of parent or guardian's South African ID",                          required: true  },
  { key: "proofOfResidence",  label: "Proof of Residence",              hint: "Utility bill, affidavit or lease agreement (not older than 3 months)",             required: true  },
  { key: "schoolReport",      label: "Latest School Report",            hint: "Most recent report card or academic transcript from previous school",              required: true  },
  { key: "transferLetter",    label: "Transfer Letter / Card",          hint: "Required if transferring from another school (obtainable from previous school)",   required: false },
];

const STEPS = ["Grade", "Learner", "Subjects", "Documents", "Review"];

export function ApplyWizard() {
  const router            = useRouter();
  const applications      = useQuery(api.enrollments.listMine) ?? [];
  const saveDraft         = useMutation(api.enrollments.saveDraft);
  const generateUploadUrl = useMutation(api.enrollments.generateNscUploadUrl);
  const submitApplication = useMutation(api.enrollments.submitApplication);

  const [step, setStep] = useState(1);
  const [gradeLabel, setGradeLabel] = useState("");

  // Learner details (entered by parent)
  const [studentEmail, setStudentEmail] = useState("");
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState(""); // parent contact
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [currentMarks, setCurrentMarks] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<DocState>({ birthCert: null, parentId: null, proofOfResidence: null, schoolReport: null, transferLetter: null });
  const [notes, setNotes] = useState("");

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleSubject(name: string) {
    setSelectedSubjects((cur) =>
      cur.includes(name) ? cur.filter((s) => s !== name) : [...cur, name],
    );
  }

  async function uploadFile(file: File): Promise<Id<"_storage">> {
    const url = await generateUploadUrl({});
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    return storageId;
  }

  async function onSaveDraft() {
    if (!gradeLabel) return;
    setIsSavingDraft(true);
    try {
      const marksArray = Object.entries(currentMarks).map(([subject, mark]) => ({ subject, mark: Number(mark) }));
      await saveDraft({ gradeLabel, selectedSubjectNames: selectedSubjects, currentMarks: marksArray, notes: notes.trim() || undefined });
    } finally { setIsSavingDraft(false); }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!gradeLabel || selectedSubjects.length === 0) return;
    setIsSubmitting(true);
    try {
      const [birthCertStorageId, parentIdStorageId, proofOfResidenceStorageId, schoolReportStorageId, transferLetterStorageId] =
        await Promise.all([
          docs.birthCert        ? uploadFile(docs.birthCert)        : Promise.resolve(undefined),
          docs.parentId         ? uploadFile(docs.parentId)         : Promise.resolve(undefined),
          docs.proofOfResidence ? uploadFile(docs.proofOfResidence) : Promise.resolve(undefined),
          docs.schoolReport     ? uploadFile(docs.schoolReport)     : Promise.resolve(undefined),
          docs.transferLetter   ? uploadFile(docs.transferLetter)   : Promise.resolve(undefined),
        ]);

      const marksArray = Object.entries(currentMarks).map(([subject, mark]) => ({ subject, mark: Number(mark) }));

      const appId = await submitApplication({
        gradeLabel,
        studentEmail: studentEmail.trim().toLowerCase(),
        studentFirstName: studentFirstName.trim() || undefined,
        studentLastName: studentLastName.trim() || undefined,
        selectedCourseIds: [],
        selectedSubjectNames: selectedSubjects,
        currentMarks: marksArray,
        notes: notes.trim() || undefined,
        phone: phone.trim() || undefined,
        gender: gender || undefined,
        dob: dob ? new Date(dob).getTime() : undefined,
        birthCertStorageId, parentIdStorageId, proofOfResidenceStorageId, schoolReportStorageId, transferLetterStorageId,
      });

      router.push(`/apply/submitted/${appId}`);
    } finally { setIsSubmitting(false); }
  }

  return (
    <div className="grid gap-8">
      <form onSubmit={onSubmit} className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-700 mb-2">Admissions Portal</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Register Your Child</h1>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-2xl">
            As a parent or guardian, complete all five steps to enrol your child. Once your application is approved and payment is made, your child will receive an email invitation to access the platform.
          </p>
        </div>

        {/* Step indicators */}
        {step < 6 && (
          <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-1">
            {STEPS.map((label, i) => {
              const n = i + 1;
              return (
                <div key={n} className="flex shrink-0 items-center gap-1.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition ${
                    step === n ? "bg-slate-950 text-white" : step > n ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  }`}>
                    {step > n ? "✓" : n}
                  </div>
                  <span className={`text-xs font-bold whitespace-nowrap ${step === n ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
                  {n < STEPS.length && <span className="text-slate-200 mx-1">›</span>}
                </div>
              );
            })}
          </div>
        )}

        <div className="grid gap-6">

          {/* ── Step 1: Grade ── */}
          {step === 1 && (
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Which grade is your child applying for?</p>
                <p className="mt-1 text-xs text-slate-400">Select the grade your learner will be entering in the upcoming academic year.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {HS_GRADES.map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => { setGradeLabel(grade); setSelectedSubjects([]); }}
                    className={`rounded-3xl border-2 p-5 text-center transition-all ${
                      gradeLabel === grade
                        ? "border-sky-500 bg-sky-50 ring-4 ring-sky-500/10"
                        : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <p className={`text-sm font-black ${gradeLabel === grade ? "text-sky-700" : "text-slate-700"}`}>{grade}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Learner Details ── */}
          {step === 2 && (
            <div className="grid gap-5">
              <div>
                <p className="text-sm font-bold text-slate-900">Learner Information</p>
                <p className="mt-1 text-xs text-slate-400">
                  Enter your child&apos;s details. Once payment is confirmed, an invitation email will be sent to their email address so they can create their account.
                </p>
              </div>

              {/* Student email — required */}
              <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/50 p-5 grid gap-4">
                <p className="text-xs font-black uppercase tracking-widest text-sky-600">Learner&apos;s Account Email</p>
                <label className="grid gap-1.5 text-sm font-bold text-slate-900">
                  Email Address <span className="text-rose-500">*</span>
                  <input
                    type="email"
                    required
                    placeholder="learner@example.com"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                  />
                  <span className="text-xs font-normal text-slate-400">This is the email your child will use to sign in to the platform.</span>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-bold text-slate-900">
                  First Name
                  <input type="text" placeholder="e.g. Thabo" value={studentFirstName} onChange={(e) => setStudentFirstName(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-900">
                  Last Name
                  <input type="text" placeholder="e.g. Dlamini" value={studentLastName} onChange={(e) => setStudentLastName(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-1.5 text-sm font-bold text-slate-900">
                  Date of Birth
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-900">
                  Gender
                  <select value={gender} onChange={(e) => setGender(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 appearance-none">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Prefer not to say</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-900">
                  Your Contact Number
                  <input type="tel" placeholder="+27 ..." value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
                </label>
              </div>
            </div>
          )}

          {/* ── Step 3: Subject Selection ── */}
          {step === 3 && (
            <div className="grid gap-5">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Select your subjects for {gradeLabel || "this grade"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Learners typically take 7 subjects. Life Orientation is compulsory. Select at least one Home Language and one Mathematics option.
                  <span className="ml-2 font-bold text-sky-600">{selectedSubjects.length} selected</span>
                </p>
              </div>

              <div className="grid gap-5">
                {Object.entries(gradeLabel === "Grade 8" || gradeLabel === "Grade 9" ? SENIOR_PHASE_SUBJECTS : SA_SUBJECTS).map(([category, subjects]) => (
                  <div key={category}>
                    <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">{category}</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {subjects.map((subject) => {
                        const active = selectedSubjects.includes(subject);
                        return (
                          <button
                            key={subject}
                            type="button"
                            onClick={() => toggleSubject(subject)}
                            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all ${
                              active
                                ? "border-sky-500 bg-sky-50 ring-2 ring-sky-500/10 font-bold text-sky-900"
                                : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200 hover:bg-white"
                            }`}
                          >
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] transition ${
                              active ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300"
                            }`}>
                              {active ? "✓" : ""}
                            </span>
                            {subject}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: Documents & Marks ── */}
          {step === 4 && (
            <div className="grid gap-8">
              <div>
                <p className="text-sm font-bold text-slate-900">Supporting Documents</p>
                <p className="mt-1 text-xs text-slate-400">Upload certified copies. Accepted formats: PDF, JPG, PNG.</p>
              </div>
              {DOCS.map(({ key, label, hint, required }) => {
                const file = docs[key];
                return (
                  <label key={key} className="grid gap-2 text-sm font-bold text-slate-900 cursor-pointer">
                    <div className="flex items-center gap-2">
                      {label}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${required ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-400"}`}>
                        {required ? "Required" : "Optional"}
                      </span>
                    </div>
                    <p className="text-xs font-normal text-slate-400">{hint}</p>
                    <div className="relative group">
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setDocs((d) => ({ ...d, [key]: e.target.files?.[0] ?? null }))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className={`rounded-3xl border-2 border-dashed p-6 text-center transition ${
                        file ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-slate-50 group-hover:border-sky-300 group-hover:bg-sky-50/30"
                      }`}>
                        <p className={`text-sm font-bold ${file ? "text-emerald-700" : "text-slate-400"}`}>
                          {file ? `✓  ${file.name}` : "Click or drag to upload"}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}

              {/* Enter current marks for selected subjects */}
              {selectedSubjects.length > 0 && (
                <div className="mt-4 pt-6 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-900 mb-4">Current Marks</p>
                  <p className="text-xs text-slate-400 mb-4">Please enter your most recent percentage mark for the subjects you intend to study.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedSubjects.map((subject) => (
                      <label key={subject} className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                        {subject}
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            placeholder="e.g. 75"
                            value={currentMarks[subject] ?? ""}
                            onChange={(e) => setCurrentMarks((prev) => ({ ...prev, [subject]: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" 
                          />
                          <span className="absolute right-4 top-2.5 text-sm text-slate-400">%</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 5: Review ── */}
          {step === 5 && (
            <div className="grid gap-6">
              <div className="rounded-3xl bg-slate-50 border border-slate-100 p-7 grid gap-5">
                <h3 className="text-base font-black text-slate-900">Application Summary</h3>
                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Learner</p>
                    <p className="font-bold text-slate-950">{[studentFirstName, studentLastName].filter(Boolean).join(" ") || "—"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{studentEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Grade Applying For</p>
                    <p className="font-bold text-slate-950">{gradeLabel || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Subjects Selected</p>
                    <p className="font-bold text-slate-950">{selectedSubjects.length} subject{selectedSubjects.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Subject List</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubjects.map((s) => (
                        <span key={s} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Documents</p>
                    <div className="grid gap-1">
                      {DOCS.map(({ key, label, required }) => (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <span className={docs[key] ? "text-emerald-600" : required ? "text-rose-500" : "text-slate-300"}>
                            {docs[key] ? "✓" : required ? "✗" : "–"}
                          </span>
                          <span className={docs[key] ? "text-slate-700" : required ? "font-bold text-rose-500" : "text-slate-400"}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <label className="grid gap-2 text-sm font-bold text-slate-900">
                Additional Notes (optional)
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  placeholder="Any additional information for the admissions office..."
                  className="rounded-3xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm outline-none transition focus:border-sky-500" />
              </label>
            </div>
          )}

        </div>

        {/* Navigation buttons */}
        {step < 6 && (
          <div className="mt-10 flex flex-wrap items-center justify-between border-t border-slate-100 pt-8">
            <div className="flex gap-4">
              {step > 1 && (
                <button type="button" onClick={() => setStep((s) => s - 1)}
                  className="rounded-2xl border border-slate-200 px-7 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                  Back
                </button>
              )}
              <button type="button" onClick={() => void onSaveDraft()} disabled={isSavingDraft || !gradeLabel}
                className="text-sm font-bold text-sky-600 hover:text-sky-700 disabled:opacity-30">
                {isSavingDraft ? "Saving…" : "Save Draft"}
              </button>
            </div>

            {step < 5 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)}
                disabled={(step === 1 && !gradeLabel) || (step === 2 && !studentEmail.trim()) || (step === 3 && selectedSubjects.length === 0)}
                className="rounded-2xl bg-slate-950 px-9 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-950/20 hover:bg-slate-800 transition disabled:opacity-40">
                Next
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting || !gradeLabel || selectedSubjects.length === 0}
                className="rounded-2xl bg-[#7c4dff] px-9 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#7c4dff]/20 hover:bg-[#6c3bed] transition disabled:opacity-50">
                {isSubmitting ? "Submitting…" : "Submit Application"}
              </button>
            )}
          </div>
        )}
      </form>

    </div>
  );
}

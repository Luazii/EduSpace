"use client";

import { useQuery, useMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { 
  CheckCircle2, 
  XCircle, 
  User, 
  BookOpen, 
  FileText, 
  ArrowLeft,
  Calendar,
  CreditCard,
  AlertCircle,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";

export default function EnrollmentReviewPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as Id<"enrollmentApplications">;
  
  const application = useQuery(api.enrollments.getById, { applicationId });
  const approve = useMutation(api.enrollments.approveApplication);
  const reject = useMutation(api.enrollments.rejectApplication);

  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this student? This will officially enroll them in their selected courses.")) return;
    setIsProcessing(true);
    try {
      await approve({ applicationId });
      router.push("/admin/enrollments");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await reject({ applicationId, notes: rejectNotes });
      router.push("/admin/enrollments");
    } finally {
      setIsProcessing(false);
    }
  };

  if (application === undefined) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (!application) return <div>Application not found.</div>;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-14 sm:px-10">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Link 
            href="/admin/enrollments"
            className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admissions Queue
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Review Application
            </h1>
            <span className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest ${
              application.status === "submitted" ? "bg-sky-50 text-sky-700" :
              application.status === "pre_approved" ? "bg-amber-50 text-amber-700" :
              application.status === "approved" ? "bg-emerald-50 text-emerald-700" :
              "bg-rose-50 text-rose-700"
            }`}>
              {application.status}
            </span>
          </div>
        </div>

        {(application.status === "submitted" || application.status === "pre_approved") && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowRejectModal(true)}
              disabled={isProcessing}
              className="rounded-2xl border border-slate-200 bg-white px-8 py-4 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-50"
            >
              Reject Candidate
            </button>
            <button 
              onClick={handleApprove}
              disabled={isProcessing}
              className="rounded-2xl bg-slate-950 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800 disabled:opacity-50"
            >
              Approve & Enroll
            </button>
          </div>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Student Profile Card */}
        <div className="lg:col-span-2 space-y-8">
          <section className="rounded-4xl border border-slate-200 bg-white p-10 shadow-sm">
            <div className="mb-8 flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-2xl font-black text-slate-400">
                {application.student?.fullName?.[0] || "?"}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-950">{application.student?.fullName || "Awaiting Profile Sync"}</h2>
                <p className="text-slate-500">{application.student?.email}</p>
                <div className="mt-2 flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-[#7c4dff]">
                  <span>Member ID: {application.student?._id.slice(-6)}</span>
                  <span>Applied {format(application.createdAt, "PPP")}</span>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="mt-8 grid gap-8 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Target Faculty</p>
                <p className="text-sm font-bold text-slate-900">{application.faculty?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Qualification</p>
                <p className="text-sm font-bold text-slate-900">{application.qualification?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Gender</p>
                <p className="text-sm font-bold text-slate-900 capitalize">{application.studentProfile?.gender || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Date of Birth</p>
                <p className="text-sm font-bold text-slate-900">
                  {application.studentProfile?.dob ? format(application.studentProfile.dob, "PP") : "N/A"}
                </p>
              </div>
            </div>
            
            <div className="mt-6">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Contact Number</p>
               <p className="text-sm font-bold text-slate-900">{application.student?.phone || "No contact provided"}</p>
            </div>
          </section>

          {/* NSC Results Section */}
          <section className="rounded-4xl border border-slate-200 bg-white p-10 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-sky-600" />
                <h3 className="text-xl font-bold text-slate-950">NSC Academic Standing</h3>
              </div>
              {application.nscSubmission?.storageId && (
                <DocumentLink storageId={application.nscSubmission.storageId} />
              )}
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-100">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-4">Subject Name</th>
                    <th className="px-6 py-4">Mark (%)</th>
                    <th className="px-6 py-4">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {application.nscSubmission?.subjects.map((sub: any, i: number) => (
                    <tr key={i} className="text-sm">
                      <td className="px-6 py-4 font-bold text-slate-900">{sub.name}</td>
                      <td className="px-6 py-4 font-black text-slate-950">{sub.mark}%</td>
                      <td className="px-6 py-4 text-slate-500">
                        {sub.mark >= 80 ? "L7" : sub.mark >= 70 ? "L6" : sub.mark >= 60 ? "L5" : "L4"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Planned Courses */}
          <section className="rounded-4xl border border-slate-200 bg-white p-10 shadow-sm">
            <div className="mb-8 flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-emerald-600" />
              <h3 className="text-xl font-bold text-slate-950">Enrollment Selection</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {application.courses.map((course: any) => (
                <div key={course._id} className="flex items-center gap-4 rounded-2xl border border-slate-50 bg-slate-50/50 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm font-black text-xs text-slate-400">
                    {course.courseCode}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{course.courseName}</p>
                    <p className="text-[10px] text-slate-400">Semester {course.semester}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Status & Action */}
        <aside className="space-y-6">
          <div className="rounded-4xl bg-slate-950 p-8 text-white shadow-xl">
            <h4 className="text-lg font-bold mb-6">Decision Intelligence</h4>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-white/10 rounded-xl">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/60 mb-1">Payment Status</p>
                  <p className="text-sm font-black uppercase tracking-widest text-white">{application.paymentStatus}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-white/10 rounded-xl">
                  <AlertCircle className="h-5 w-5 text-sky-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/60 mb-1">System Audit</p>
                  <p className="text-sm font-black uppercase tracking-widest text-white">Verified Pass</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
            <h4 className="text-lg font-bold text-slate-950 mb-4">Application Notes</h4>
            <p className="text-sm text-slate-500 leading-relaxed italic">
              "{application.notes || "No candidate notes provided."}"
            </p>
          </div>
        </aside>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-6">
          <div className="w-full max-w-md rounded-4xl bg-white p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-950">Reject Candidate</h3>
            <p className="mt-4 text-sm text-slate-500 leading-7">
              Provide specific feedback for the student. They will be notified of your decision and the reason behind it.
            </p>
            <textarea 
              className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10 transition"
              rows={4}
              placeholder="e.g., Missing required certified ID copy..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
            <div className="mt-8 flex items-center gap-4">
              <button 
                onClick={() => setShowRejectModal(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                disabled={!rejectNotes.trim() || isProcessing}
                className="flex-1 rounded-2xl bg-rose-600 py-4 text-sm font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function DocumentLink({ storageId }: { storageId: string }) {
  const url = useQuery(api.enrollments.getFileUrl, { storageId: storageId as any });
  
  if (!url) return <span className="text-xs text-slate-400">Loading...</span>;

  return (
    <Link 
      href={url}
      target="_blank"
      className="text-xs font-bold text-sky-600 hover:underline"
    >
      View Original Document
    </Link>
  );
}

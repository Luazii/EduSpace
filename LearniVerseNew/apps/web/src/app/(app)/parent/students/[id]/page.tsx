"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";

export default function ParentStudentReportPage() {
  const params = useParams();
  const studentId = params.id as Id<"users">;
  
  const student = useQuery(api.users.getById, { userId: studentId });
  const marks = useQuery(api.courses.getStudentFinalMarks, { studentUserId: studentId }) ?? [];
  const addComment = useMutation(api.parentServices.addReportComment);
  
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMarkId, setActiveMarkId] = useState<Id<"finalMarks"> | null>(null);

  const handleComment = async () => {
    if (!activeMarkId || !commentText.trim()) return;
    setIsSubmitting(true);
    try {
      await addComment({
        finalMarkId: activeMarkId,
        comment: commentText.trim(),
      });
      setCommentText("");
      setActiveMarkId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (student === undefined) return <div className="h-screen animate-pulse bg-slate-50" />;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Link 
            href="/parent/dashboard"
            className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-xl font-black text-white">
              {student?.fullName?.[0] || "?"}
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-950">{student?.fullName}</h1>
              <p className="text-sm font-medium text-slate-500">Student Achievement Report • {format(Date.now(), "MMMM yyyy")}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
           <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2 mb-6">
            <BookOpen className="h-5 w-5 text-sky-600" />
            Active Course Performance
          </h2>

          <div className="grid gap-6">
            {marks.map((mark: any) => (
              <section 
                key={mark._id}
                className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-xl hover:shadow-slate-200/20"
              >
                <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-950">{mark.courseName}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{mark.courseCode} • Semester {mark.semester}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Weighted Mark</p>
                      <p className="text-3xl font-black text-slate-950">
                        {mark.computedFinalMark !== undefined ? `${mark.computedFinalMark}%` : "Pending"}
                      </p>
                    </div>
                  </div>
                </header>

                <div className="grid gap-8 border-t border-slate-50 pt-6 sm:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Assignments (Computed)</span>
                      <span className="text-xs font-black text-slate-950">{mark.computedAssignmentPercent}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Quizzes (Computed)</span>
                      <span className="text-xs font-black text-slate-950">{mark.computedQuizPercent}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher Observation</p>
                     <p className="text-xs text-slate-600 leading-relaxed italic">
                       "{mark.notes || "No teacher summary provided for this period."}"
                     </p>
                  </div>
                </div>

                {/* Parent Comments Section */}
                <div className="mt-8 border-t border-slate-50 pt-6">
                   <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#7c4dff] flex items-center gap-2">
                      <MessageSquare className="h-3 w-3" />
                      Parental Commentary
                    </h4>
                    <button 
                      onClick={() => setActiveMarkId(mark._id)}
                      className="text-[10px] font-black uppercase tracking-widest text-sky-600 hover:text-sky-800 transition"
                    >
                      + Leave Comment
                    </button>
                  </div>

                  <div className="space-y-4">
                    {mark.parentComments?.map((c: any, i: number) => (
                      <div key={i} className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs text-slate-600 leading-relaxed italic">"{c.comment}"</p>
                        <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase">{format(c.createdAt, "PPP")}</p>
                      </div>
                    ))}
                    {(!mark.parentComments || mark.parentComments.length === 0) && (
                      <p className="text-xs text-slate-400 italic">No parent comments recorded.</p>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Sidebar Summary */}
        <aside className="space-y-8">
          <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
             <div className="flex items-center gap-4 mb-8">
               <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                 <FileText className="h-6 w-6" />
               </div>
               <h3 className="text-lg font-bold text-slate-950">Academic standing</h3>
             </div>
             
             <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Active Enrollment
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Curriculum</p>
                  <p className="text-sm font-bold text-slate-900">National Senior Certificate (NSC)</p>
                </div>
             </div>
          </section>

          <div className="rounded-4xl bg-[#7c4dff] p-8 text-white">
            <Calendar className="h-8 w-8 text-white/60 mb-4" />
            <h4 className="text-xl font-bold mb-4">Meetings & Engagements</h4>
            <p className="text-sm text-white/70 leading-relaxed mb-6">
              Meetings are arranged by the school. View your scheduled meetings and confirm attendance from your dashboard.
            </p>
            <Link
              href="/parent/dashboard"
              className="block w-full rounded-2xl bg-white py-4 text-center text-xs font-black uppercase tracking-widest text-[#7c4dff] transition hover:bg-slate-50"
            >
              View My Meetings
            </Link>
          </div>
        </aside>
      </div>

      {/* Comment Modal */}
      {activeMarkId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-6">
          <div className="w-full max-w-md rounded-4xl border border-slate-200 bg-white p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-950">Leave Comment</h3>
            <p className="mt-4 text-sm text-slate-500 leading-7">
              Provide feedback or acknowledgment on this academic period. This will be stored as part of the student's formal record.
            </p>
            <textarea 
              className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 transition font-bold"
              rows={4}
              placeholder="e.g., We have reviewed the results and discussed the feedback with our child..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <div className="mt-8 flex items-center gap-4">
              <button 
                onClick={() => setActiveMarkId(null)}
                className="flex-1 rounded-2xl border border-slate-200 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleComment}
                disabled={!commentText.trim() || isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-sm font-bold text-white shadow-lg shadow-slate-950/20 hover:bg-slate-800 transition disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Submit Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

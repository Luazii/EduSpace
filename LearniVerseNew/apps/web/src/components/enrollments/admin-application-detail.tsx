"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";

import { api } from "../../../convex/_generated/api";

type AdminApplicationDetailProps = {
  applicationId: string;
};

export function AdminApplicationDetail({
  applicationId,
}: AdminApplicationDetailProps) {
  const typedApplicationId = applicationId as Id<"enrollmentApplications">;
  const application = useQuery(api.enrollments.getById, {
    applicationId: typedApplicationId,
  });
  const approveApplication = useMutation(api.enrollments.approveApplication);
  const rejectApplication = useMutation(api.enrollments.rejectApplication);
  const [rejectionNote, setRejectionNote] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  async function approve() {
    setIsApproving(true);
    try {
      await approveApplication({ applicationId: typedApplicationId });
    } finally {
      setIsApproving(false);
    }
  }

  async function reject() {
    setIsRejecting(true);
    try {
      await rejectApplication({
        applicationId: typedApplicationId,
        notes: rejectionNote.trim() || undefined,
      });
    } finally {
      setIsRejecting(false);
    }
  }

  if (application === undefined) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 text-sm text-slate-500 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        Loading application...
      </div>
    );
  }

  if (!application) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Application not found
        </h1>
        <Link
          href="/admin/enrollments"
          className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Back to applications
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
              Enrollment review
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {application.student?.fullName ?? application.student?.email}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {application.faculty?.name} · {application.qualification?.name}
            </p>
          </div>
          <Link
            href="/admin/enrollments"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
          >
            Back to queue
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Application details
          </h2>
          <div className="mt-6 grid gap-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              Courses:{" "}
              {application.courses
                .map((course: (typeof application.courses)[number]) => course?.courseName)
                .join(", ")}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              Status: {application.status} · Payment: {application.paymentStatus}
            </div>
            {application.notes ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                Notes: {application.notes}
              </div>
            ) : null}
            {application.nscSubmission ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="font-semibold text-slate-950">
                  NSC document: {application.nscSubmission.fileName}
                </p>
                <div className="mt-3 grid gap-2">
                  {application.nscSubmission.subjects.map((subject, index) => (
                    <p key={index}>
                      {subject.name}: {subject.mark}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Review actions
          </h2>
          <div className="mt-6 grid gap-4">
            <button
              type="button"
              onClick={() => void approve()}
              disabled={isApproving || application.status === "approved"}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isApproving ? "Approving..." : "Approve application"}
            </button>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Rejection note
              <textarea
                value={rejectionNote}
                onChange={(event) => setRejectionNote(event.target.value)}
                rows={4}
                placeholder="Optional reason for rejection"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
              />
            </label>
            <button
              type="button"
              onClick={() => void reject()}
              disabled={isRejecting || application.status === "rejected"}
              className="rounded-full border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-500 disabled:cursor-not-allowed disabled:border-red-100 disabled:text-red-300"
            >
              {isRejecting ? "Rejecting..." : "Reject application"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

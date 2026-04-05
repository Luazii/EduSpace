"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";

import { api } from "../../../convex/_generated/api";

type VerifyPaymentClientProps = {
  applicationId: string;
  reference: string;
};

export function VerifyPaymentClient({
  applicationId,
  reference,
}: VerifyPaymentClientProps) {
  const verifyTransaction = useAction(api.payments.verifyTransaction);
  const [status, setStatus] = useState<"verifying" | "success" | "failed">(
    "verifying",
  );
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const result = await verifyTransaction({
          applicationId: applicationId as Id<"enrollmentApplications">,
          reference,
        });

        if (cancelled) {
          return;
        }

        if (result.ok) {
          setStatus("success");
          setMessage("Payment verified successfully.");
        } else {
          setStatus("failed");
          setMessage(`Payment verification returned ${result.status}.`);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus("failed");
        setMessage(
          error instanceof Error ? error.message : "Payment verification failed.",
        );
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [applicationId, reference, verifyTransaction]);

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-md">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {status === "verifying" ? (
          <div className="flex h-16 w-16 animate-spin items-center justify-center rounded-full border-4 border-slate-200 border-t-sky-600 mb-6" />
        ) : status === "success" ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-6">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        )}

        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
          Payment verification
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          {status === "verifying"
            ? "Checking your payment"
            : status === "success"
              ? "Payment confirmed"
              : "Verification failed"}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
          {message}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/apply"
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back to applications
          </Link>
          <Link
            href="/payments"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
          >
            View payment history
          </Link>
        </div>
      </div>
    </section>
  );
}

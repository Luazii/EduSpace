"use client";

import { useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export default function FeeCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get("reference") ?? params.get("trxref");
  const invoiceId = params.get("invoiceId") as Id<"feeInvoices"> | null;
  const verifyPayment = useAction(api.fees.verifyFeePayment);
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reference || !invoiceId) {
      setStatus("failed");
      setMessage("Missing payment reference.");
      return;
    }
    verifyPayment({ reference, invoiceId })
      .then((res) => {
        if (res.success) {
          setStatus("success");
          setMessage(`Payment of R ${res.amountPaid?.toLocaleString()} confirmed.`);
          setTimeout(() => router.push("/parent/fees"), 3000);
        } else {
          setStatus("failed");
          setMessage(res.message ?? "Payment could not be confirmed.");
        }
      })
      .catch((e) => {
        setStatus("failed");
        setMessage(e instanceof Error ? e.message : "Verification failed.");
      });
  }, [reference, invoiceId]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        {status === "verifying" && (
          <>
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <h2 className="text-lg font-black text-slate-950">Verifying payment…</h2>
            <p className="mt-2 text-sm text-slate-500">Please wait while we confirm your payment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
            <h2 className="text-xl font-black text-slate-950">Payment confirmed!</h2>
            <p className="mt-2 text-sm text-slate-500">{message}</p>
            <p className="mt-3 text-xs text-slate-400">Redirecting to fees…</p>
          </>
        )}
        {status === "failed" && (
          <>
            <XCircle className="mx-auto mb-4 h-14 w-14 text-rose-500" />
            <h2 className="text-xl font-black text-slate-950">Payment issue</h2>
            <p className="mt-2 text-sm text-slate-500">{message}</p>
            <button onClick={() => router.push("/parent/fees")} className="mt-6 w-full rounded-2xl bg-slate-950 py-3 text-sm font-black text-white">
              Back to fees
            </button>
          </>
        )}
      </div>
    </main>
  );
}

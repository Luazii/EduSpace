"use client";

import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import QRCodeLib from "qrcode";

function TicketQrImage({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) void QRCodeLib.toCanvas(canvasRef.current, code, { width: 180, margin: 2 });
  }, [code]);
  return <canvas ref={canvasRef} />;
}

function TicketCallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get("reference") ?? params.get("trxref");
  const isGuest = params.get("guest") === "1";
  const verifyPayment = useAction(api.events.verifyTicketPayment);
  const verifyGuestPayment = useAction(api.events.verifyGuestTicketPayment);
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("");
  const [ticketCode, setTicketCode] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      setMessage("Missing payment reference.");
      return;
    }

    if (isGuest) {
      verifyGuestPayment({ reference })
        .then((res) => {
          if (res.ok && res.ticketCode) {
            setStatus("success");
            setTicketCode(res.ticketCode);
            setMessage("Your ticket is ready — save or screenshot the QR code below.");
          } else {
            setStatus("failed");
            setMessage(`Payment status: ${res.status}.`);
          }
        })
        .catch((e) => {
          setStatus("failed");
          setMessage(e instanceof Error ? e.message : "Verification failed.");
        });
      return;
    }

    verifyPayment({ reference })
      .then((res) => {
        if (res.ok) {
          setStatus("success");
          setMessage("Your ticket is ready — find it under My Tickets.");
          setTimeout(() => router.push("/events"), 3000);
        } else {
          setStatus("failed");
          setMessage(`Payment status: ${res.status}.`);
        }
      })
      .catch((e) => {
        setStatus("failed");
        setMessage(e instanceof Error ? e.message : "Verification failed.");
      });
  }, [reference, isGuest]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        {status === "verifying" && (
          <>
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-rose-600 border-t-transparent" />
            <h2 className="text-lg font-black text-slate-950">Verifying payment…</h2>
            <p className="mt-2 text-sm text-slate-500">Please wait while we confirm your ticket payment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
            <h2 className="text-xl font-black text-slate-950">Ticket secured!</h2>
            <p className="mt-2 text-sm text-slate-500">{message}</p>
            {ticketCode && (
              <>
                <div className="mt-6 inline-flex flex-col items-center rounded-2xl bg-slate-50 border border-slate-200 p-5">
                  <TicketQrImage code={ticketCode} />
                  <p className="mt-3 text-xs font-mono font-bold text-slate-700 tracking-widest">{ticketCode}</p>
                </div>
                <p className="mt-3 text-[10px] text-slate-400">Present this QR code at the entrance.</p>
                <button onClick={() => router.push("/events")} className="mt-6 w-full rounded-2xl bg-slate-950 py-3 text-sm font-black text-white">
                  Back to events
                </button>
              </>
            )}
            {!ticketCode && <p className="mt-3 text-xs text-slate-400">Redirecting to your tickets…</p>}
          </>
        )}
        {status === "failed" && (
          <>
            <XCircle className="mx-auto mb-4 h-14 w-14 text-rose-500" />
            <h2 className="text-xl font-black text-slate-950">Payment issue</h2>
            <p className="mt-2 text-sm text-slate-500">{message}</p>
            <button onClick={() => router.push("/events")} className="mt-6 w-full rounded-2xl bg-slate-950 py-3 text-sm font-black text-white">
              Back to events
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function CallbackLoadingFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-rose-600 border-t-transparent" />
        <h2 className="text-lg font-black text-slate-950">Loading…</h2>
      </div>
    </main>
  );
}

export default function TicketCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoadingFallback />}>
      <TicketCallbackContent />
    </Suspense>
  );
}

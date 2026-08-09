"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import QRCode from "qrcode";
import { RefreshCcw } from "lucide-react";

/**
 * Renders the signed-in student's scan code as an actual, camera-scannable
 * QR image — their "ID card" for both sports attendance and bus boarding.
 * Generates the code server-side on first render if they don't have one yet.
 */
export function StudentQrCode() {
  const existingCode = useQuery(api.users.getMyScanCode);
  const ensureScanCode = useMutation(api.users.ensureScanCode);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (existingCode === null && !requested) {
      setRequested(true);
      void ensureScanCode();
    }
  }, [existingCode, requested, ensureScanCode]);

  useEffect(() => {
    if (existingCode && canvasRef.current) {
      void QRCode.toCanvas(canvasRef.current, existingCode, { width: 220, margin: 2 });
    }
  }, [existingCode]);

  if (existingCode === undefined || existingCode === null) {
    return (
      <div className="flex h-[220px] w-[220px] items-center justify-center rounded-3xl border border-slate-200 bg-slate-50">
        <RefreshCcw className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{existingCode}</p>
      <p className="max-w-xs text-center text-xs text-slate-500">
        Show this to your coach or bus driver to check in — it's used for both sports attendance and bus boarding.
      </p>
    </div>
  );
}

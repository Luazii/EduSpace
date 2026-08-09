"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, XCircle } from "lucide-react";

/**
 * Real camera-based QR scanner (device webcam via html5-qrcode) — not a
 * text-input stand-in. Calls onScan(code) once per successful decode; the
 * caller is responsible for debouncing repeat scans of the same code if
 * the camera stays open (see driver/coach usage).
 */
export function QrScanner({ onScan, active }: { onScan: (code: string) => void; active: boolean }) {
  const elementId = useId().replace(/:/g, "-");
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (cancelled) return;
      const scanner = new Html5QrcodeScanner(
        elementId,
        { fps: 10, qrbox: { width: 220, height: 220 }, rememberLastUsedCamera: true },
        false,
      );
      scannerRef.current = scanner;
      scanner.render(
        (decodedText: string) => onScan(decodedText),
        () => {
          // Fires continuously while no code is in frame — not a real error, ignore.
        },
      );
    }).catch(() => setError("Couldn't load the camera scanner in this browser."));

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [active, elementId, onScan]);

  if (!active) return null;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <XCircle className="h-6 w-6 text-rose-500" />
        <p className="text-xs font-bold text-rose-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <Camera className="h-3.5 w-3.5" /> Point the camera at a student's QR code
      </div>
      <div id={elementId} className="overflow-hidden rounded-2xl" />
    </div>
  );
}

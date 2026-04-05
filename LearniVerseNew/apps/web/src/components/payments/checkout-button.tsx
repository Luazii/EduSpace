"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";

import { api } from "../../../convex/_generated/api";

type CheckoutButtonProps = {
  applicationId: string;
};

export function CheckoutButton({ applicationId }: CheckoutButtonProps) {
  const initializeCheckout = useAction(api.payments.initializeCheckout);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setIsStarting(true);
    setError(null);

    try {
      const result = await initializeCheckout({
        applicationId: applicationId as Id<"enrollmentApplications">,
        origin: window.location.origin,
      });

      window.location.href = result.authorizationUrl;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={isStarting}
        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isStarting ? "Starting checkout..." : "Pay now"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

import { VerifyPaymentClient } from "@/components/payments/verify-payment-client";

type PaymentsCallbackPageProps = {
  searchParams: Promise<{
    applicationId?: string;
    reference?: string;
  }>;
};

export default async function PaymentsCallbackPage({
  searchParams,
}: PaymentsCallbackPageProps) {
  const { applicationId, reference } = await searchParams;

  if (!applicationId || !reference) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            Missing payment reference
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            The payment callback did not include the information needed to verify the transaction.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      <VerifyPaymentClient applicationId={applicationId} reference={reference} />
    </main>
  );
}

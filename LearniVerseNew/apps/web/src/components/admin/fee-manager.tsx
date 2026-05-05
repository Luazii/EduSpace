"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Receipt, Wallet, FileText, Check } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function FeeManager() {
  const structures = useQuery(api.fees.listStructures) ?? [];
  const invoices = useQuery(api.fees.listInvoices) ?? [];
  const receipts = useQuery(api.fees.listReceipts, {}) ?? [];
  const students = useQuery(api.users.list)?.filter((user) => user.role === "student") ?? [];
  const classes = useQuery(api.classes.list) ?? [];

  const createStructure = useMutation(api.fees.createStructure);
  const createInvoice = useMutation(api.fees.createInvoice);
  const capturePayment = useMutation(api.fees.capturePayment);

  const [structureName, setStructureName] = useState("");
  const [gradeName, setGradeName] = useState("");
  const [academicYear, setAcademicYear] = useState("2026");
  const [tuitionAmount, setTuitionAmount] = useState("0");
  const [registrationAmount, setRegistrationAmount] = useState("0");
  const [otherAmount, setOtherAmount] = useState("0");
  const [notes, setNotes] = useState("");

  const [invoiceStudentId, setInvoiceStudentId] = useState("");
  const [invoiceClassId, setInvoiceClassId] = useState("");
  const [invoiceStructureId, setInvoiceStructureId] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");

  const [paymentInvoiceId, setPaymentInvoiceId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "eft" | "card" | "paystack">("eft");
  const [reference, setReference] = useState("");

  const outstandingInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.balance > 0),
    [invoices],
  );

  async function onCreateStructure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createStructure({
      name: structureName,
      gradeName,
      academicYear,
      tuitionAmount: Number(tuitionAmount),
      registrationAmount: Number(registrationAmount),
      otherAmount: Number(otherAmount),
      notes: notes || undefined,
    });
    setStructureName("");
    setGradeName("");
    setTuitionAmount("0");
    setRegistrationAmount("0");
    setOtherAmount("0");
    setNotes("");
  }

  async function onCreateInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoiceStudentId || !invoiceStructureId) return;
    await createInvoice({
      studentUserId: invoiceStudentId as Id<"users">,
      classId: invoiceClassId ? (invoiceClassId as Id<"classes">) : undefined,
      feeStructureId: invoiceStructureId as Id<"feeStructures">,
      dueDate: invoiceDueDate ? new Date(invoiceDueDate).getTime() : undefined,
    });
    setInvoiceStudentId("");
    setInvoiceClassId("");
    setInvoiceStructureId("");
    setInvoiceDueDate("");
  }

  async function onCapturePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentInvoiceId || !paymentAmount) return;
    await capturePayment({
      invoiceId: paymentInvoiceId as Id<"feeInvoices">,
      amount: Number(paymentAmount),
      paymentMethod,
      reference: reference || undefined,
    });
    setPaymentAmount("");
    setReference("");
  }

  return (
    <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-8">
        <form onSubmit={onCreateStructure} className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Fee Structure</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Set fee structure</h2>
          </header>
          <div className="grid gap-4">
            <input value={structureName} onChange={(e) => setStructureName(e.target.value)} placeholder="Grade 10 2026 fee plan" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
            <div className="grid grid-cols-2 gap-4">
              <input value={gradeName} onChange={(e) => setGradeName(e.target.value)} placeholder="Grade 10" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
              <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2026" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <input type="number" value={tuitionAmount} onChange={(e) => setTuitionAmount(e.target.value)} placeholder="Tuition" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
              <input type="number" value={registrationAmount} onChange={(e) => setRegistrationAmount(e.target.value)} placeholder="Registration" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
              <input type="number" value={otherAmount} onChange={(e) => setOtherAmount(e.target.value)} placeholder="Other" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
            <button className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-sm font-black uppercase tracking-widest text-white">
              <Check className="h-4 w-4" /> Save structure
            </button>
          </div>
        </form>

        <form onSubmit={onCreateInvoice} className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="mb-6 flex items-center gap-3">
            <FileText className="h-5 w-5 text-sky-600" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Invoice</p>
              <h2 className="text-2xl font-black text-slate-950">Generate invoice</h2>
            </div>
          </header>
          <div className="grid gap-4">
            <select value={invoiceStudentId} onChange={(e) => setInvoiceStudentId(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
              <option value="">Select learner</option>
              {students.map((student) => <option key={student._id} value={student._id}>{student.fullName ?? student.email}</option>)}
            </select>
            <select value={invoiceClassId} onChange={(e) => setInvoiceClassId(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
              <option value="">Optional class</option>
              {classes.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name}</option>)}
            </select>
            <select value={invoiceStructureId} onChange={(e) => setInvoiceStructureId(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
              <option value="">Select fee structure</option>
              {structures.map((structure) => <option key={structure._id} value={structure._id}>{structure.name}</option>)}
            </select>
            <input type="date" value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
            <button className="rounded-2xl bg-sky-600 py-4 text-sm font-black uppercase tracking-widest text-white">Issue invoice</button>
          </div>
        </form>

        <form onSubmit={onCapturePayment} className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="mb-6 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Receipt</p>
              <h2 className="text-2xl font-black text-slate-950">Capture payment</h2>
            </div>
          </header>
          <div className="grid gap-4">
            <select value={paymentInvoiceId} onChange={(e) => setPaymentInvoiceId(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
              <option value="">Select invoice</option>
              {outstandingInvoices.map((invoice) => (
                <option key={invoice._id} value={invoice._id}>{invoice.invoiceNumber} · {invoice.student?.fullName ?? invoice.student?.email} · balance R {invoice.balance}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Amount" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
                <option value="eft">EFT</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="paystack">Paystack</option>
              </select>
            </div>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
            <button className="rounded-2xl bg-emerald-600 py-4 text-sm font-black uppercase tracking-widest text-white">Generate receipt</button>
          </div>
        </form>
      </div>

      <div className="space-y-8">
        <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Invoices</p>
            <h2 className="text-2xl font-black text-slate-950">Student balances</h2>
          </header>
          <div className="grid gap-4">
            {invoices.map((invoice) => (
              <article key={invoice._id} className="rounded-3xl border border-slate-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-950">{invoice.invoiceNumber}</h3>
                    <p className="text-sm text-slate-500">{invoice.student?.fullName ?? invoice.student?.email}</p>
                    <p className="text-xs text-slate-400">{invoice.structure?.name} · {invoice.academicYear}</p>
                  </div>
                  <div className="text-right text-sm font-bold">
                    <p>Total R {invoice.totalAmount}</p>
                    <p className="text-emerald-700">Paid R {invoice.amountPaid}</p>
                    <p className="text-rose-600">Balance R {invoice.balance}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="mb-6 flex items-center gap-3">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Receipts</p>
              <h2 className="text-2xl font-black text-slate-950">Payment trail</h2>
            </div>
          </header>
          <div className="grid gap-4">
            {receipts.map((receipt) => (
              <article key={receipt._id} className="rounded-3xl border border-slate-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-950">{receipt.receiptNumber}</h3>
                    <p className="text-sm text-slate-500">{receipt.student?.fullName ?? receipt.student?.email}</p>
                    <p className="text-xs text-slate-400">Invoice {receipt.invoice?.invoiceNumber ?? "-"}</p>
                  </div>
                  <div className="text-right text-sm font-bold text-emerald-700">
                    <p>R {receipt.amount}</p>
                    <p className="text-xs uppercase tracking-widest text-slate-400">{receipt.paymentMethod}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

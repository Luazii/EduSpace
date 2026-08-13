import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// Sends a ticket confirmation email (QR code + event details) via Resend.
// Triggered by scheduler from the ticket-issuing mutations/actions in events.ts
// on every path that makes a ticket valid: free signed-in, free guest, paid
// signed-in (post-verification), paid guest (post-verification).
export const sendTicketConfirmation = internalAction({
  args: {
    to: v.string(),
    recipientName: v.string(),
    eventTitle: v.string(),
    eventDate: v.number(),
    eventLocation: v.string(),
    ticketCode: v.string(),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn(`[emails] RESEND_API_KEY not configured — skipping ticket email for ${args.ticketCode}`);
      return;
    }

    // In this environment, test accounts use addresses that don't exist —
    // TICKET_EMAIL_OVERRIDE forces every ticket email to a real inbox instead
    // (also required by Resend's sandbox mode until a sending domain is verified).
    const overrideEmail = process.env.TICKET_EMAIL_OVERRIDE?.trim();
    const to = overrideEmail || args.to;
    const redirected = !!overrideEmail && overrideEmail.toLowerCase() !== args.to.toLowerCase();

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(args.ticketCode)}`;

    const formattedDate = new Date(args.eventDate).toLocaleString("en-ZA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const priceRow = args.amount
      ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Amount paid</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#0f172a;font-size:13px;">R${args.amount}</td></tr>`
      : "";

    const redirectNotice = redirected
      ? `<div style="margin:0 0 20px;padding:12px 16px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:12px;font-weight:600;line-height:1.5;">
           Test mode: this ticket was purchased with <strong>${args.to}</strong>, and this email was redirected to <strong>${to}</strong> because ticket emails are pointed at a single inbox in this environment.
         </div>`
      : "";

    const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;padding:32px 20px;">
  <div style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
    <div style="background:#e11d48;padding:28px 32px;">
      <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#ffffff;font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:4px 10px;border-radius:999px;">EduSpace Events</span>
      <h1 style="margin:14px 0 0;color:#ffffff;font-size:22px;font-weight:800;">Your ticket is confirmed</h1>
    </div>
    <div style="padding:28px 32px;">
      ${redirectNotice}
      <p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.6;">
        Hi ${args.recipientName},<br/>
        Here's your e-ticket for <strong>${args.eventTitle}</strong>. Save this email or screenshot the QR code below — you'll need it at the gate.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Event</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#0f172a;font-size:13px;">${args.eventTitle}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Date &amp; time</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#0f172a;font-size:13px;">${formattedDate}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Location</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#0f172a;font-size:13px;">${args.eventLocation}</td></tr>
        ${priceRow}
      </table>
      <div style="text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
        <img src="${qrCodeUrl}" alt="Ticket QR code" width="200" height="200" style="display:block;margin:0 auto;border-radius:8px;" />
        <p style="margin:14px 0 0;font-family:monospace;font-weight:700;letter-spacing:0.08em;color:#334155;font-size:13px;">${args.ticketCode}</p>
      </div>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:11px;text-align:center;">Present this QR code at the entrance to be scanned in.</p>
    </div>
  </div>
</div>`.trim();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EduSpace Events <onboarding@resend.dev>",
        to: [to],
        subject: `Your ticket for ${args.eventTitle}`,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[emails] Resend send failed (${res.status}) for ticket ${args.ticketCode}:`, text);
    }
  },
});

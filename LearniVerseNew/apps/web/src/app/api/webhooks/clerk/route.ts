import { headers } from "next/headers";
import { Webhook } from "svix";
import { type WebhookEvent } from "@clerk/nextjs/webhooks";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!secret) {
    return new Response("Missing CLERK_WEBHOOK_SIGNING_SECRET", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(secret);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (error) {
    console.error("Clerk webhook verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log("Received Clerk webhook", {
    type: evt.type,
    id: evt.data.id,
  });

  return Response.json({ received: true });
}

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk } from "@/lib/api";
import {
  handleCalendlyInviteeCreated,
  verifyCalendlySignature,
} from "@/lib/calendly/webhook";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit({
      key: clientKey(req, "calendly-webhook"),
      limit: 120,
      windowMs: 60_000,
    });
    if (!limited.ok) return jsonError("Too many webhook requests", 429);

    await connectDB();
    const rawBody = await req.text();
    const signature = req.headers.get("calendly-webhook-signature");
    const verified = verifyCalendlySignature(rawBody, signature);
    if (!verified.ok) return jsonError("Invalid Calendly signature", 401);

    const body = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        email?: string;
        name?: string;
        scheduled_event?: {
          start_time?: string;
          uri?: string;
          name?: string;
        };
        tracking?: { utm_content?: string };
      };
    };

    if (body.event !== "invitee.created") {
      return jsonOk({ ok: true, ignored: true, event: body.event });
    }

    const result = await handleCalendlyInviteeCreated({
      email: body.payload?.email,
      name: body.payload?.name,
      startTime: body.payload?.scheduled_event?.start_time,
      eventUri: body.payload?.scheduled_event?.uri,
      eventName: body.payload?.scheduled_event?.name,
      schedulingUrl: body.payload?.tracking?.utm_content,
    });

    if (!result.ok) return jsonError(result.error || "Webhook handling failed", 400);
    return jsonOk({ ...result, signatureDemo: verified.demo });
  } catch (error) {
    console.error(error);
    return jsonError(error instanceof Error ? error.message : "Webhook failed", 500);
  }
}

/** Demo helper to simulate a Calendly booking without real webhooks. */
export async function PUT(req: NextRequest) {
  try {
    const limited = rateLimit({
      key: clientKey(req, "calendly-simulate"),
      limit: 30,
      windowMs: 60_000,
    });
    if (!limited.ok) return jsonError("Too many simulation requests", 429);

    await connectDB();
    const body = (await req.json()) as {
      email: string;
      startTime: string;
      eventName?: string;
    };
    const result = await handleCalendlyInviteeCreated({
      email: body.email,
      startTime: body.startTime,
      eventName: body.eventName || "HR Interview",
      eventUri: `demo-calendly-${Date.now()}`,
    });
    if (!result.ok) return jsonError(result.error || "Simulation failed", 400);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Simulation failed", 500);
  }
}

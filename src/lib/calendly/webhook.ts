import crypto from "crypto";
import { addMinutes } from "date-fns";
import { CandidateProfile, Interview, RecruiterProfile, AdminProfile } from "@/models";
import { createGoogleCalendarEvent } from "@/lib/google/calendar";
import { postSlackMessage } from "@/lib/slack/client";
import type { InterviewStage } from "@/types";

export function verifyCalendlySignature(rawBody: string, signatureHeader?: string | null) {
  const secret = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!secret) return { ok: true, demo: true as const };
  if (!signatureHeader) return { ok: false, demo: false as const };

  // Calendly sends: t=timestamp,v1=signature
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return { ok: false, demo: false as const };

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try {
    const valid =
      expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    return { ok: valid, demo: false as const };
  } catch {
    return { ok: false, demo: false as const };
  }
}

function inferStage(text: string): InterviewStage {
  const value = text.toLowerCase();
  if (value.includes("final") || value.includes("hiring manager")) return "final";
  if (value.includes("tech") || value.includes("technical")) return "tech";
  return "hr";
}

export async function handleCalendlyInviteeCreated(payload: {
  email?: string;
  name?: string;
  startTime?: string;
  eventUri?: string;
  eventName?: string;
  schedulingUrl?: string;
}) {
  if (!payload.email || !payload.startTime) {
    return { ok: false, error: "Missing email or start time" };
  }

  const candidate = await CandidateProfile.findOne({
    email: payload.email.toLowerCase(),
  });
  if (!candidate) {
    return { ok: false, error: "Candidate not found for invitee email" };
  }

  const stage = inferStage(`${payload.eventName || ""} ${payload.schedulingUrl || ""}`);
  let recruiterId =
    stage === "tech"
      ? candidate.techRecruiterId
      : stage === "final"
        ? candidate.adminId
        : candidate.recruiterId;

  if (!recruiterId && stage === "final") {
    const admin = await AdminProfile.findOne({ userId: candidate.adminId }).lean();
    recruiterId = admin?.userId;
  }

  if (!recruiterId && stage === "tech") {
    const tech = await RecruiterProfile.findOne({
      adminId: candidate.adminId,
      recruiterType: "tech",
      status: "active",
    }).lean();
    recruiterId = tech?.userId;
  }

  if (!recruiterId) {
    const hr = await RecruiterProfile.findOne({
      adminId: candidate.adminId,
      recruiterType: "hr",
      status: "active",
    }).lean();
    recruiterId = hr?.userId || candidate.recruiterId;
  }

  if (!recruiterId || !candidate.adminId) {
    return { ok: false, error: "No recruiter/admin assignment for candidate" };
  }

  const start = new Date(payload.startTime);
  const end = addMinutes(start, 45);

  const existing = await Interview.findOne({
    candidateId: candidate._id,
    stage,
    status: "scheduled",
    calendlyEventUri: payload.eventUri,
  });
  if (existing) return { ok: true, interviewId: String(existing._id), deduped: true };

  const calendar = await createGoogleCalendarEvent({
    summary: `${stage.toUpperCase()} Interview — ${candidate.name}`,
    description: `Auto-created from Calendly booking (${payload.eventName || "event"})`,
    start,
    end,
    attendeeEmails: [candidate.email],
  });

  const interview = await Interview.create({
    candidateId: candidate._id,
    candidateUserId: candidate.userId,
    recruiterId,
    adminId: candidate.adminId,
    stage,
    status: "scheduled",
    scheduledAt: start,
    endsAt: end,
    calendlyEventUri: payload.eventUri,
    googleCalendarEventId: calendar.eventId,
    googleMeetLink: calendar.hangoutLink,
    notes: "Created via Calendly webhook",
  });

  candidate.status = "scheduled";
  if (stage === "hr") candidate.hrScheduledAt = start;
  if (stage === "tech") candidate.techScheduledAt = start;
  if (stage === "final") candidate.finalScheduledAt = start;
  candidate.statusHistory.push({
    status: "scheduled",
    at: new Date(),
    note: `Calendly webhook booked ${stage} interview`,
  });
  await candidate.save();

  await postSlackMessage(
    `📅 Calendly booked ${stage.toUpperCase()} interview with ${candidate.name} at ${start.toLocaleString()}`
  );

  return { ok: true, interviewId: String(interview._id), stage, meetLink: calendar.hangoutLink };
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, toObject, withAuth } from "@/lib/api";
import {
  CandidateProfile,
  Interview,
  NotificationTemplate,
  RecruiterProfile,
} from "@/models";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from "@/lib/google/calendar";
import { sendEmail } from "@/lib/email/send";
import { DEFAULT_NOTIFICATION_TEMPLATES, renderTemplate } from "@/data/sample-messages";
import { canJoinInterview, minutesUntil } from "@/lib/utils/dates";
import { postSlackMessage } from "@/lib/slack/client";
import { notifyMany } from "@/lib/notify";
import { assertRecruiterSlotAvailable } from "@/lib/scheduling";
import { writeAudit } from "@/lib/audit";
import { addMinutes } from "date-fns";
import type { AuthUser } from "@/types";

function canManageInterview(
  user: AuthUser,
  interview: { recruiterId: unknown; adminId: unknown; candidateUserId: unknown }
) {
  if (user.role === "admin") return String(interview.adminId) === user.id;
  if (user.role === "recruiter") return String(interview.recruiterId) === user.id;
  if (user.role === "candidate") return String(interview.candidateUserId) === user.id;
  return false;
}

function previousStatusForStage(stage: string) {
  if (stage === "tech") return "hr_pass" as const;
  if (stage === "final") return "tech_pass" as const;
  return "connected" as const;
}

export async function GET(req: NextRequest) {
  return withAuth(["admin", "recruiter", "candidate", "superadmin"], async (user) => {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");
    const status = searchParams.get("status") || "scheduled";
    const filter: Record<string, unknown> = {};

    if (user.role === "admin") filter.adminId = user.id;
    if (user.role === "recruiter") {
      filter.recruiterId = user.id;
      filter.stage = user.recruiterType === "tech" ? "tech" : "hr";
    }
    if (user.role === "candidate") filter.candidateUserId = user.id;
    if (stage) filter.stage = stage;
    if (status !== "all") filter.status = status;

    const items = await Interview.find(filter)
      .populate({
        path: "candidateId",
        select:
          "name email birthday location experienceYears majorStack linkedinUrl resumeUrl whatsapp techStack status",
      })
      .populate("recruiterId", "username email avatarUrl")
      .sort({ scheduledAt: 1 })
      .lean();

    const enriched = items.map((item) => ({
      ...item,
      canJoin: item.status === "scheduled" && canJoinInterview(item.scheduledAt),
      minutesUntil: minutesUntil(item.scheduledAt),
    }));

    return jsonOk({ items: toObject(enriched) });
  });
}

const createSchema = z.object({
  candidateId: z.string(),
  recruiterId: z.string().optional(),
  stage: z.enum(["hr", "tech", "final"]),
  scheduledAt: z.string(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(["admin", "recruiter", "candidate"], async (user) => {
    const body = createSchema.parse(await req.json());
    const candidate = await CandidateProfile.findById(body.candidateId);
    if (!candidate) return jsonError("Candidate not found", 404);

    let recruiterId = body.recruiterId || String(candidate.recruiterId || "");
    if (user.role === "recruiter") recruiterId = user.id;
    if (body.stage === "tech" && candidate.techRecruiterId) {
      recruiterId = String(candidate.techRecruiterId);
    }
    if (!recruiterId && user.role === "candidate") {
      recruiterId = String(candidate.recruiterId || candidate.techRecruiterId || "");
    }
    if (!recruiterId) return jsonError("No recruiter assigned", 400);

    const start = new Date(body.scheduledAt);
    if (Number.isNaN(start.getTime())) {
      return jsonError("Invalid scheduledAt datetime", 400);
    }
    const end = addMinutes(start, 45);

    const slot = await assertRecruiterSlotAvailable({
      recruiterUserId: recruiterId,
      start,
      durationMinutes: 45,
    });
    if (!slot.ok) return jsonError(slot.reason, 409);

    const calendar = await createGoogleCalendarEvent({
      summary: `${body.stage.toUpperCase()} Interview — ${candidate.name}`,
      description: body.notes || "HireFlow scheduled interview",
      start,
      end,
      attendeeEmails: [candidate.email, user.email],
    });

    const interview = await Interview.create({
      candidateId: candidate._id,
      candidateUserId: candidate.userId,
      recruiterId,
      adminId: candidate.adminId || user.adminId || user.id,
      stage: body.stage,
      status: "scheduled",
      scheduledAt: start,
      endsAt: end,
      googleCalendarEventId: calendar.eventId,
      googleMeetLink: calendar.hangoutLink,
      notes: body.notes,
    });

    candidate.status = "scheduled";
    if (body.stage === "hr") candidate.hrScheduledAt = start;
    if (body.stage === "tech") candidate.techScheduledAt = start;
    if (body.stage === "final") candidate.finalScheduledAt = start;
    candidate.statusHistory.push({
      status: "scheduled",
      at: new Date(),
      note: `${body.stage} interview scheduled`,
    });
    await candidate.save();

    await postSlackMessage(
      `📅 ${body.stage.toUpperCase()} interview scheduled with ${candidate.name} at ${start.toLocaleString()}`
    );

    await notifyMany([candidate.userId, recruiterId, candidate.adminId], {
      type: "interview.scheduled",
      title: `${body.stage.toUpperCase()} interview scheduled`,
      body: `${candidate.name} — ${start.toLocaleString()}`,
      href:
        user.role === "candidate"
          ? "/candidate/schedule"
          : user.role === "admin"
            ? "/admin/calendar"
            : "/recruiter/scheduled",
      meta: { interviewId: String(interview._id) },
    });

    return jsonOk({ item: toObject(interview), calendar }, { status: 201 });
  });
}

const actionSchema = z.object({
  interviewId: z.string(),
  action: z.enum(["reminder", "waiting", "join_notify", "cancel", "reschedule"]),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  return withAuth(["recruiter", "admin", "candidate"], async (user) => {
    const body = actionSchema.parse(await req.json());
    const interview = await Interview.findById(body.interviewId);
    if (!interview) return jsonError("Interview not found", 404);
    if (!canManageInterview(user, interview)) return jsonError("Forbidden", 403);

    const candidate = await CandidateProfile.findById(interview.candidateId);
    if (!candidate) return jsonError("Candidate not found", 404);

    if (body.action === "cancel") {
      if (interview.status !== "scheduled") {
        return jsonError("Only scheduled interviews can be cancelled", 400);
      }

      interview.status = "cancelled";
      if (body.notes) interview.notes = body.notes;
      await interview.save();
      await deleteGoogleCalendarEvent(interview.googleCalendarEventId);

      const revert = previousStatusForStage(interview.stage);
      candidate.status = revert;
      if (interview.stage === "hr") candidate.hrScheduledAt = undefined;
      if (interview.stage === "tech") candidate.techScheduledAt = undefined;
      if (interview.stage === "final") candidate.finalScheduledAt = undefined;
      candidate.statusHistory.push({
        status: revert,
        at: new Date(),
        by: user.id as unknown as never,
        note: `${interview.stage} interview cancelled by ${user.role}`,
      });
      await candidate.save();

      await postSlackMessage(
        `❌ ${interview.stage.toUpperCase()} interview cancelled for ${candidate.name}`
      );
      await notifyMany([candidate.userId, interview.recruiterId, candidate.adminId], {
        type: "interview.cancelled",
        title: `${interview.stage.toUpperCase()} interview cancelled`,
        body: `${candidate.name} — cancelled by ${user.username}`,
        href:
          user.role === "candidate" ? "/candidate/schedule" : "/recruiter/scheduled",
        meta: { interviewId: String(interview._id) },
      });

      await writeAudit({
        actor: user,
        action: "interview.cancel",
        entityType: "interview",
        entityId: interview._id,
        summary: `${user.username} cancelled ${interview.stage} interview for ${candidate.name}`,
        adminId: interview.adminId,
      });

      return jsonOk({ item: toObject(interview), candidateStatus: candidate.status });
    }

    if (body.action === "reschedule") {
      if (interview.status !== "scheduled") {
        return jsonError("Only scheduled interviews can be rescheduled", 400);
      }
      if (!body.scheduledAt) return jsonError("scheduledAt is required for reschedule");

      const start = new Date(body.scheduledAt);
      if (Number.isNaN(start.getTime())) {
        return jsonError("Invalid scheduledAt datetime", 400);
      }
      const end = addMinutes(start, 45);

      const slot = await assertRecruiterSlotAvailable({
        recruiterUserId: String(interview.recruiterId),
        start,
        durationMinutes: 45,
        ignoreInterviewId: String(interview._id),
      });
      if (!slot.ok) return jsonError(slot.reason, 409);

      const calendar = await updateGoogleCalendarEvent({
        eventId: interview.googleCalendarEventId,
        summary: `${interview.stage.toUpperCase()} Interview — ${candidate.name}`,
        description: body.notes || interview.notes || "HireFlow rescheduled interview",
        start,
        end,
        attendeeEmails: [candidate.email, user.email],
      });

      interview.scheduledAt = start;
      interview.endsAt = end;
      interview.status = "scheduled";
      interview.googleCalendarEventId = calendar.eventId;
      if (calendar.hangoutLink) interview.googleMeetLink = calendar.hangoutLink;
      interview.reminderSentAt = undefined;
      interview.waitingSentAt = undefined;
      interview.joinNotifiedAt = undefined;
      if (body.notes) interview.notes = body.notes;
      await interview.save();

      candidate.status = "scheduled";
      if (interview.stage === "hr") candidate.hrScheduledAt = start;
      if (interview.stage === "tech") candidate.techScheduledAt = start;
      if (interview.stage === "final") candidate.finalScheduledAt = start;
      candidate.statusHistory.push({
        status: "scheduled",
        at: new Date(),
        by: user.id as unknown as never,
        note: `${interview.stage} interview rescheduled`,
      });
      await candidate.save();

      await postSlackMessage(
        `🔁 ${interview.stage.toUpperCase()} interview rescheduled for ${candidate.name} at ${start.toLocaleString()}`
      );
      await notifyMany([candidate.userId, interview.recruiterId, candidate.adminId], {
        type: "interview.rescheduled",
        title: `${interview.stage.toUpperCase()} interview rescheduled`,
        body: `${candidate.name} — ${start.toLocaleString()}`,
        href:
          user.role === "candidate" ? "/candidate/schedule" : "/recruiter/scheduled",
        meta: { interviewId: String(interview._id) },
      });

      await writeAudit({
        actor: user,
        action: "interview.reschedule",
        entityType: "interview",
        entityId: interview._id,
        summary: `${user.username} rescheduled ${interview.stage} interview for ${candidate.name}`,
        adminId: interview.adminId,
      });

      return jsonOk({ item: toObject(interview), calendar });
    }

    const recruiter = await RecruiterProfile.findOne({ userId: interview.recruiterId });
    const type = body.action === "waiting" ? "waiting" : "reminder";
    const tpl =
      (await NotificationTemplate.findOne({ userId: interview.recruiterId, type })) ||
      DEFAULT_NOTIFICATION_TEMPLATES[type];

    const vars = {
      candidateName: candidate.name,
      recruiterName: recruiter?.name || "Recruiter",
      scheduledAt: new Date(interview.scheduledAt).toLocaleString(),
      meetLink: interview.googleMeetLink || "https://meet.google.com/",
      companyName: "HireFlow",
      stage: interview.stage.toUpperCase(),
    };

    if (body.action === "reminder" || body.action === "waiting") {
      if (user.role === "candidate") {
        return jsonError("Candidates cannot send reminder/waiting messages", 403);
      }
      await sendEmail({
        fromUserId: user.id,
        toEmail: candidate.email,
        toUserId: candidate.userId,
        type,
        subject: renderTemplate(tpl.subject, vars),
        body: renderTemplate(tpl.body, vars),
      });

      if (body.action === "reminder") {
        interview.reminderSentAt = new Date();
        if (recruiter?.email) {
          await sendEmail({
            fromUserId: user.id,
            toEmail: recruiter.email,
            toUserId: interview.recruiterId,
            type: "reminder",
            subject: `Reminder: interview with ${candidate.name}`,
            body: `Your ${interview.stage} interview with ${candidate.name} starts at ${vars.scheduledAt}. Meet: ${vars.meetLink}`,
          });
        }
      } else {
        interview.waitingSentAt = new Date();
      }
    }

    if (body.action === "join_notify") {
      interview.joinNotifiedAt = new Date();
    }

    await interview.save();
    return jsonOk({ item: toObject(interview) });
  });
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, toObject, withAuth } from "@/lib/api";
import {
  CandidateProfile,
  RecruiterProfile,
  NotificationTemplate,
  User,
} from "@/models";
import { sendEmail } from "@/lib/email/send";
import { DEFAULT_NOTIFICATION_TEMPLATES, renderTemplate } from "@/data/sample-messages";
import { ageFromBirthday } from "@/lib/utils/dates";
import type { CandidateStatus } from "@/types";

export async function GET(req: NextRequest) {
  return withAuth(["admin", "superadmin", "recruiter"], async (user) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const q = searchParams.get("q");
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") || 50));

    const filter: Record<string, unknown> = {};
    if (user.role === "admin") filter.adminId = user.id;
    if (user.role === "recruiter") {
      if (user.recruiterType === "tech") filter.techRecruiterId = user.id;
      else filter.recruiterId = user.id;
    }
    if (status) filter.status = status;
    if (q) filter.$text = { $search: q };

    const [items, total] = await Promise.all([
      CandidateProfile.find(filter)
        .populate("recruiterId", "username email phone avatarUrl")
        .populate("techRecruiterId", "username email phone avatarUrl")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      CandidateProfile.countDocuments(filter),
    ]);

    const mapped = items.map((c) => ({
      ...c,
      age: ageFromBirthday(c.birthday),
    }));

    return jsonOk({
      items: toObject(mapped),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  });
}

const actionSchema = z.object({
  candidateId: z.string(),
  action: z.enum([
    "pass_hr",
    "fail_hr",
    "pass_tech",
    "fail_tech",
    "pass_final",
    "fail_final",
    "connect",
    "decline",
    "assign_recruiter",
    "send_offer",
  ]),
  techRecruiterId: z.string().optional(),
  offerHtml: z.string().optional(),
  offerTitle: z.string().optional(),
  acknowledgeRecruiterFail: z.boolean().optional(),
});

async function getTemplate(
  userId: string,
  type: keyof typeof DEFAULT_NOTIFICATION_TEMPLATES
) {
  const found = await NotificationTemplate.findOne({ userId, type });
  return found || DEFAULT_NOTIFICATION_TEMPLATES[type];
}

export async function PATCH(req: NextRequest) {
  return withAuth(["admin"], async (user) => {
    const body = actionSchema.parse(await req.json());
    const candidate = await CandidateProfile.findOne({
      _id: body.candidateId,
      adminId: user.id,
    });
    if (!candidate) return jsonError("Candidate not found", 404);

    const adminProfileUser = await User.findById(user.id);
    const companyName = "HireFlow Partner";

    const pushStatus = (status: CandidateStatus, note?: string) => {
      candidate.status = status;
      candidate.statusHistory.push({
        status,
        at: new Date(),
        by: user.id as unknown as never,
        note,
      });
    };

    if (body.action === "assign_recruiter" || body.action === "connect") {
      if (!body.techRecruiterId && body.action === "assign_recruiter") {
        return jsonError("Recruiter required");
      }
      const recruiterId = body.techRecruiterId;
      if (recruiterId) {
        candidate.recruiterId = recruiterId as unknown as never;
        pushStatus("connected", "Assigned by admin");
      }
    }

    if (body.action === "decline") {
      pushStatus("declined");
    }

    if (body.action === "pass_hr") {
      if (!body.techRecruiterId) {
        return jsonError("Select a technical recruiter before confirming HR Pass", 400);
      }
      if (candidate.status === "hr_failed" && !body.acknowledgeRecruiterFail) {
        return jsonError(
          "Recruiter marked this candidate as failed. Acknowledge comment before overriding.",
          409,
          { warning: true, comment: candidate.lastAssessmentComment || "No comment provided." }
        );
      }

      const tech = await RecruiterProfile.findOne({
        userId: body.techRecruiterId,
        adminId: user.id,
        recruiterType: "tech",
      });
      if (!tech) return jsonError("Technical recruiter not found", 404);

      candidate.techRecruiterId = body.techRecruiterId as unknown as never;
      pushStatus("hr_pass", "Admin confirmed HR Pass");

      const tpl = await getTemplate(user.id, "tech_invite");
      const vars = {
        candidateName: candidate.name,
        techRecruiterName: tech.name,
        calendlyUrl: tech.calendlyUrl || "https://calendly.com/hireflow-tech",
        companyName: companyName,
        stage: "HR",
      };
      await sendEmail({
        fromUserId: user.id,
        toEmail: candidate.email,
        toUserId: candidate.userId,
        type: "tech_invite",
        subject: renderTemplate(tpl.subject, vars),
        body: renderTemplate(tpl.body, vars),
      });
    }

    if (body.action === "fail_hr") pushStatus("hr_failed", "Admin marked HR Failed");
    if (body.action === "fail_tech") pushStatus("tech_failed", "Admin marked Tech Failed");
    if (body.action === "fail_final") pushStatus("final_failed", "Admin marked Final Failed");

    if (body.action === "pass_tech") {
      if (candidate.status === "tech_failed" && !body.acknowledgeRecruiterFail) {
        return jsonError(
          "Technical recruiter marked fail. Acknowledge before overriding.",
          409,
          { warning: true, comment: candidate.lastAssessmentComment || "No comment provided." }
        );
      }
      pushStatus("tech_pass", "Admin confirmed Tech Pass");
      const tpl = await getTemplate(user.id, "final_invite");
      const vars = {
        candidateName: candidate.name,
        calendlyUrl: "https://calendly.com/hireflow-final",
        companyName,
        stage: "Technical",
      };
      await sendEmail({
        fromUserId: user.id,
        toEmail: candidate.email,
        toUserId: candidate.userId,
        type: "final_invite",
        subject: renderTemplate(tpl.subject, vars),
        body: renderTemplate(tpl.body, vars),
      });
    }

    if (body.action === "pass_final" || body.action === "send_offer") {
      pushStatus(body.action === "send_offer" ? "offer_sent" : "final_pass");
      if (body.action === "pass_final" || body.action === "send_offer") {
        const tpl = await getTemplate(user.id, "offer");
        const offerContent =
          body.offerHtml ||
          `<p>Congratulations ${candidate.name}! We are excited to offer you a role.</p>`;
        const vars = {
          candidateName: candidate.name,
          companyName: adminProfileUser?.username || companyName,
          offerContent,
          stage: "Final",
        };
        await sendEmail({
          fromUserId: user.id,
          toEmail: candidate.email,
          toUserId: candidate.userId,
          type: "offer",
          subject: renderTemplate(tpl.subject, vars),
          body: renderTemplate(tpl.body, vars),
          html: offerContent,
        });
        if (body.action === "pass_final") pushStatus("offer_sent", body.offerTitle);
      }
    }

    await candidate.save();
    return jsonOk({ item: toObject(candidate) });
  });
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, toObject, withAuth } from "@/lib/api";
import {
  Assessment,
  CandidateProfile,
  NotificationTemplate,
  RecruiterProfile,
} from "@/models";
import { sendEmail } from "@/lib/email/send";
import { DEFAULT_NOTIFICATION_TEMPLATES, renderTemplate } from "@/data/sample-messages";
import { ageFromBirthday } from "@/lib/utils/dates";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  return withAuth(["recruiter", "admin"], async (user) => {
    const stage = user.recruiterType === "tech" ? "tech" : "hr";

    if (user.role === "recruiter") {
      const candidateFilter =
        stage === "tech"
          ? { techRecruiterId: user.id, status: { $in: ["hr_pass", "scheduled", "tech_pass", "tech_failed"] } }
          : {
              recruiterId: user.id,
              status: { $in: ["connected", "scheduled", "hr_pass", "hr_failed"] },
            };

      const candidates = await CandidateProfile.find(candidateFilter).select("_id adminId").lean();
      await Promise.all(
        candidates.map((c) =>
          Assessment.findOneAndUpdate(
            { candidateId: c._id, stage },
            {
              $setOnInsert: {
                recruiterId: user.id,
                adminId: c.adminId || user.adminId,
                stage,
                decision: "pending",
              },
            },
            { upsert: true, new: true }
          )
        )
      );
    }

    const filter: Record<string, unknown> = {};
    if (user.role === "recruiter") {
      filter.recruiterId = user.id;
      filter.stage = stage;
    }
    if (user.role === "admin") filter.adminId = user.id;

    const items = await Assessment.find(filter)
      .populate({
        path: "candidateId",
        select:
          "name email birthday location experienceYears majorStack linkedinUrl resumeUrl whatsapp recordingUrl techStack status",
      })
      .sort({ updatedAt: -1 })
      .lean();

    const mapped = items.map((a) => ({
      ...a,
      age: ageFromBirthday(
        (a.candidateId as unknown as { birthday?: string })?.birthday
      ),
    }));

    return jsonOk({ items: toObject(mapped) });
  });
}

const upsertSchema = z.object({
  candidateId: z.string(),
  stage: z.enum(["hr", "tech", "final"]).optional(),
  recordingUrl: z.string().optional(),
  englishLevel: z.number().min(0).max(10).optional(),
  communication: z.number().min(0).max(10).optional(),
  logistics: z.number().min(0).max(10).optional(),
  adaptability: z.number().min(0).max(10).optional(),
  confidence: z.number().min(0).max(10).optional(),
  problemSolving: z.number().min(0).max(10).optional(),
  availableUsEastern: z.boolean().optional(),
  interestedInRole: z.boolean().optional(),
  technicalSkills: z
    .object({
      cloudArchitecture: z.number().min(0).max(10).optional(),
      backend: z.number().min(0).max(10).optional(),
      frontend: z.number().min(0).max(10).optional(),
      overall: z.number().min(0).max(10).optional(),
    })
    .optional(),
  comment: z.string().optional(),
  decision: z.enum(["pass", "fail", "pending"]).optional(),
});

export async function PUT(req: NextRequest) {
  return withAuth(["recruiter"], async (user) => {
    const body = upsertSchema.parse(await req.json());
    const stage = body.stage || (user.recruiterType === "tech" ? "tech" : "hr");

    const candidate = await CandidateProfile.findById(body.candidateId);
    if (!candidate) return jsonError("Candidate not found", 404);

    const assessment = await Assessment.findOneAndUpdate(
      { candidateId: body.candidateId, stage },
      {
        $set: {
          ...body,
          recruiterId: user.id,
          adminId: candidate.adminId || user.adminId,
          stage,
          decidedAt: body.decision && body.decision !== "pending" ? new Date() : undefined,
        },
      },
      { upsert: true, new: true }
    );

    if (body.recordingUrl) {
      candidate.recordingUrl = body.recordingUrl;
    }

    if (body.decision === "pass" || body.decision === "fail") {
      const status =
        stage === "hr"
          ? body.decision === "pass"
            ? "hr_pass"
            : "hr_failed"
          : stage === "tech"
            ? body.decision === "pass"
              ? "tech_pass"
              : "tech_failed"
            : body.decision === "pass"
              ? "final_pass"
              : "final_failed";

      candidate.status = status;
      candidate.lastAssessmentComment = body.comment;
      candidate.statusHistory.push({
        status,
        at: new Date(),
        by: user.id as unknown as never,
        note: body.comment,
      });

      if (body.decision === "pass" && stage === "hr") {
        // performance counters for recruiter when later hired are tracked separately;
        // still notify candidate of pass
      }

      const type = body.decision === "pass" ? "passed" : "failed";
      const tpl =
        (await NotificationTemplate.findOne({ userId: user.id, type })) ||
        DEFAULT_NOTIFICATION_TEMPLATES[type];
      const recruiter = await RecruiterProfile.findOne({ userId: user.id });
      const vars = {
        candidateName: candidate.name,
        recruiterName: recruiter?.name || user.username,
        companyName: "HireFlow",
        stage: stage.toUpperCase(),
        nextStepMessage:
          stage === "hr"
            ? "Our team will send your Technical Interview scheduling link shortly."
            : stage === "tech"
              ? "Our hiring manager will share the Final Interview scheduling link soon."
              : "Our team will follow up with offer details.",
      };

      await sendEmail({
        fromUserId: user.id,
        toEmail: candidate.email,
        toUserId: candidate.userId,
        type,
        subject: renderTemplate(tpl.subject, vars),
        body: renderTemplate(tpl.body, vars),
      });
    }

    await candidate.save();

    await writeAudit({
      actor: user,
      action:
        body.decision && body.decision !== "pending"
          ? `assessment.${body.decision}`
          : "assessment.save",
      entityType: "assessment",
      entityId: assessment._id,
      summary: `${user.username} ${
        body.decision && body.decision !== "pending"
          ? `marked ${body.decision}`
          : "updated assessment"
      } for ${candidate.name} (${stage})`,
      meta: { stage, decision: body.decision || "pending" },
      adminId: candidate.adminId || user.adminId,
    });

    return jsonOk({ item: toObject(assessment) });
  });
}

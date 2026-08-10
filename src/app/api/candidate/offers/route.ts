import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, toObject, withAuth } from "@/lib/api";
import { CandidateProfile, OfferLetter } from "@/models";
import { writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { bumpRecruiterHireStats } from "@/lib/performance";
import { assertCan } from "@/lib/permissions";

export async function GET() {
  return withAuth(["candidate"], async (user) => {
    assertCan(user.role, "offers.respond");
    const candidate = await CandidateProfile.findOne({ userId: user.id }).lean();
    if (!candidate) return jsonError("Candidate profile not found", 404);

    const items = await OfferLetter.find({
      candidateId: candidate._id,
      status: { $in: ["sent", "accepted", "declined"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    return jsonOk({
      candidate: toObject(candidate),
      items: toObject(items),
    });
  });
}

const schema = z.object({
  offerId: z.string(),
  decision: z.enum(["accepted", "declined"]),
});

export async function PATCH(req: NextRequest) {
  return withAuth(["candidate"], async (user) => {
    assertCan(user.role, "offers.respond");
    const body = schema.parse(await req.json());
    const candidate = await CandidateProfile.findOne({ userId: user.id });
    if (!candidate) return jsonError("Candidate profile not found", 404);

    const offer = await OfferLetter.findOne({
      _id: body.offerId,
      candidateId: candidate._id,
      status: "sent",
    });
    if (!offer) return jsonError("Offer not found or already decided", 404);

    offer.status = body.decision;
    await offer.save();

    if (body.decision === "accepted") {
      candidate.status = "hired";
      candidate.statusHistory.push({
        status: "hired",
        at: new Date(),
        by: user.id as unknown as never,
        note: "Candidate accepted offer",
      });
      await candidate.save();
      await bumpRecruiterHireStats(candidate.recruiterId);
      if (candidate.techRecruiterId) {
        await bumpRecruiterHireStats(candidate.techRecruiterId);
      }
    } else {
      candidate.statusHistory.push({
        status: candidate.status,
        at: new Date(),
        by: user.id as unknown as never,
        note: "Candidate declined offer",
      });
      await candidate.save();
    }

    await writeAudit({
      actor: user,
      action: `offer.candidate_${body.decision}`,
      entityType: "offer",
      entityId: offer._id,
      summary: `${user.username} ${body.decision} offer "${offer.title}"`,
      adminId: candidate.adminId,
    });

    if (candidate.adminId) {
      await notifyUser({
        userId: candidate.adminId,
        type: `offer.${body.decision}`,
        title: `Offer ${body.decision}`,
        body: `${candidate.name} ${body.decision} the offer letter.`,
        href: "/admin/offers",
      });
    }

    return jsonOk({ item: toObject(offer), candidateStatus: candidate.status });
  });
}

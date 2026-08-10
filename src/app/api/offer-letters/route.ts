import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, toObject, withAuth } from "@/lib/api";
import { AdminProfile, CandidateProfile, OfferLetter } from "@/models";
import { sendEmail } from "@/lib/email/send";
import { DEFAULT_NOTIFICATION_TEMPLATES, renderTemplate } from "@/data/sample-messages";
import { writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

export async function GET() {
  return withAuth(["admin"], async (user) => {
    const [items, profile] = await Promise.all([
      OfferLetter.find({ adminId: user.id })
        .populate("candidateId", "name email status")
        .sort({ createdAt: -1 })
        .lean(),
      AdminProfile.findOne({ userId: user.id }).lean(),
    ]);

    return jsonOk({
      items: toObject(items),
      templateHtml:
        profile?.offerLetterTemplateHtml ||
        "<h2>Offer Letter</h2><p>Dear {{candidateName}},</p><p>We are pleased to offer you a position at {{companyName}}.</p>",
      companyName: profile?.companyName || "HireFlow Partner",
    });
  });
}

const upsertSchema = z.object({
  id: z.string().optional(),
  candidateId: z.string().optional(),
  title: z.string().min(2).optional(),
  contentHtml: z.string().min(2).optional(),
  fileUrl: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "declined"]).optional(),
  sendNow: z.boolean().optional(),
  templateHtml: z.string().optional(),
  templateOnly: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(["admin"], async (user) => {
    const body = upsertSchema.parse(await req.json());

    if (body.templateHtml !== undefined) {
      await AdminProfile.findOneAndUpdate(
        { userId: user.id },
        { offerLetterTemplateHtml: body.templateHtml }
      );
      if (body.templateOnly || !body.candidateId) {
        return jsonOk({ ok: true, templateSaved: true });
      }
    }

    if (!body.candidateId || !body.title || !body.contentHtml) {
      return jsonError("candidateId, title, and contentHtml are required");
    }

    const candidate = await CandidateProfile.findOne({
      _id: body.candidateId,
      adminId: user.id,
    });
    if (!candidate) return jsonError("Candidate not found", 404);

    const admin = await AdminProfile.findOne({ userId: user.id }).lean();
    const rendered = renderTemplate(body.contentHtml, {
      candidateName: candidate.name,
      companyName: admin?.companyName || "HireFlow Partner",
    });

    let offer = body.id
      ? await OfferLetter.findOne({ _id: body.id, adminId: user.id })
      : null;

    if (!offer) {
      offer = await OfferLetter.create({
        adminId: user.id,
        candidateId: candidate._id,
        title: body.title,
        contentHtml: rendered,
        fileUrl: body.fileUrl,
        status: "draft",
      });
    } else {
      offer.title = body.title;
      offer.contentHtml = rendered;
      if (body.fileUrl !== undefined) offer.fileUrl = body.fileUrl;
      if (body.status) offer.status = body.status;
      await offer.save();
    }

    if (body.sendNow) {
      const tpl = DEFAULT_NOTIFICATION_TEMPLATES.offer;
      const vars = {
        candidateName: candidate.name,
        companyName: admin?.companyName || "HireFlow Partner",
        offerContent: `${rendered}${
          offer.fileUrl ? `<p><a href="${offer.fileUrl}">Download offer letter</a></p>` : ""
        }`,
        stage: "Final",
      };

      await sendEmail({
        fromUserId: user.id,
        toEmail: candidate.email,
        toUserId: candidate.userId,
        type: "offer",
        subject: renderTemplate(tpl.subject, vars),
        body: renderTemplate(tpl.body, vars),
        html: vars.offerContent,
      });

      offer.status = "sent";
      offer.sentAt = new Date();
      await offer.save();

      candidate.status = "offer_sent";
      candidate.statusHistory.push({
        status: "offer_sent",
        at: new Date(),
        by: user.id as unknown as never,
        note: offer.title,
      });
      await candidate.save();
    }

    await writeAudit({
      actor: user,
      action: body.sendNow ? "offer.send" : "offer.save",
      entityType: "offer",
      entityId: offer._id,
      summary: `${user.username} ${body.sendNow ? "sent" : "saved"} offer for ${candidate.name}`,
      adminId: user.id,
    });

    if (body.sendNow) {
      await notifyUser({
        userId: candidate.userId,
        type: "offer.sent",
        title: "Offer letter received",
        body: `You received an offer from ${admin?.companyName || "the hiring team"}.`,
        href: "/candidate/offers",
      });
    }

    return jsonOk({ item: toObject(offer) }, { status: body.id ? 200 : 201 });
  });
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["draft", "sent", "accepted", "declined"]),
});

export async function PATCH(req: NextRequest) {
  return withAuth(["admin"], async (user) => {
    const body = patchSchema.parse(await req.json());
    const offer = await OfferLetter.findOneAndUpdate(
      { _id: body.id, adminId: user.id },
      { status: body.status },
      { returnDocument: "after" }
    );
    if (!offer) return jsonError("Offer not found", 404);

    if (body.status === "accepted") {
      await CandidateProfile.findByIdAndUpdate(offer.candidateId, {
        status: "hired",
        $push: {
          statusHistory: {
            status: "hired",
            at: new Date(),
            note: "Offer accepted",
          },
        },
      });
    }

    await writeAudit({
      actor: user,
      action: `offer.${body.status}`,
      entityType: "offer",
      entityId: offer._id,
      summary: `${user.username} marked offer ${body.status}`,
      adminId: user.id,
    });

    return jsonOk({ item: toObject(offer) });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { CandidateProfile, OfferLetter, AdminProfile } from "@/models";
import { buildOfferDocumentHtml } from "@/lib/offer-document";
import { assertCan } from "@/lib/permissions";

function offerHtmlResponse(html: string, id: string) {
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="offer-${id}.html"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(["candidate", "admin"], async (user) => {
    const { id } = await context.params;

    if (user.role === "candidate") {
      assertCan(user.role, "offers.respond");
      const candidate = await CandidateProfile.findOne({ userId: user.id }).lean();
      if (!candidate) return jsonError("Candidate profile not found", 404);

      const offer = await OfferLetter.findOne({
        _id: id,
        candidateId: candidate._id,
        status: { $in: ["sent", "accepted", "declined"] },
      }).lean();
      if (!offer) return jsonError("Offer not found", 404);

      const admin = await AdminProfile.findOne({ userId: offer.adminId }).lean();
      const html = buildOfferDocumentHtml({
        title: offer.title,
        contentHtml: offer.contentHtml,
        candidateName: candidate.name,
        companyName: admin?.companyName,
        status: offer.status,
        sentAt: offer.sentAt || offer.createdAt,
      });

      return offerHtmlResponse(html, id);
    }

    assertCan(user.role, "offers.manage");
    const offer = await OfferLetter.findOne({ _id: id, adminId: user.id })
      .populate("candidateId", "name")
      .lean();
    if (!offer) return jsonError("Offer not found", 404);

    const admin = await AdminProfile.findOne({ userId: user.id }).lean();
    const candidateName =
      offer.candidateId &&
      typeof offer.candidateId === "object" &&
      "name" in offer.candidateId
        ? String((offer.candidateId as { name?: string }).name || "Candidate")
        : "Candidate";

    const html = buildOfferDocumentHtml({
      title: offer.title,
      contentHtml: offer.contentHtml,
      candidateName,
      companyName: admin?.companyName,
      status: offer.status,
      sentAt: offer.sentAt || offer.createdAt,
    });

    return offerHtmlResponse(html, id);
  });
}

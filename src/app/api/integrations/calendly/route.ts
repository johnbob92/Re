import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, withAuth } from "@/lib/api";
import {
  calendlyEmbedUrl,
  getCalendlyUser,
  isDemoCalendlyUrl,
  normalizeCalendlyUrl,
} from "@/lib/calendly/client";
import { AdminProfile, RecruiterProfile } from "@/models";

export async function GET() {
  return withAuth(["admin", "recruiter", "candidate"], async (user) => {
    const me = await getCalendlyUser();
    let schedulingUrl = me.schedulingUrl;

    if (user.role === "recruiter") {
      const profile = await RecruiterProfile.findOne({ userId: user.id }).lean();
      if (profile?.calendlyUrl) schedulingUrl = normalizeCalendlyUrl(profile.calendlyUrl);
    }
    if (user.role === "admin") {
      const profile = await AdminProfile.findOne({ userId: user.id }).lean();
      if (profile?.calendlyUrl) schedulingUrl = normalizeCalendlyUrl(profile.calendlyUrl);
    }
    if (user.role === "candidate") {
      // Prefer assigned recruiter calendly
      const { CandidateProfile } = await import("@/models");
      const candidate = await CandidateProfile.findOne({ userId: user.id }).lean();
      if (candidate?.recruiterId) {
        const recruiter = await RecruiterProfile.findOne({
          userId: candidate.recruiterId,
        }).lean();
        if (recruiter?.calendlyUrl) schedulingUrl = normalizeCalendlyUrl(recruiter.calendlyUrl);
      }
    }

    const demoEmbed = isDemoCalendlyUrl(schedulingUrl) || me.demo;
    return jsonOk({
      ...me,
      demo: demoEmbed,
      schedulingUrl,
      embedUrl: demoEmbed ? "" : calendlyEmbedUrl(schedulingUrl),
    });
  });
}

const schema = z.object({ calendlyUrl: z.string().min(3) });

export async function PUT(req: NextRequest) {
  return withAuth(["admin", "recruiter"], async (user) => {
    const body = schema.parse(await req.json());
    const url = normalizeCalendlyUrl(body.calendlyUrl);
    if (user.role === "admin") {
      await AdminProfile.findOneAndUpdate({ userId: user.id }, { calendlyUrl: url });
    } else {
      await RecruiterProfile.findOneAndUpdate({ userId: user.id }, { calendlyUrl: url });
    }
    return jsonOk({ calendlyUrl: url, embedUrl: calendlyEmbedUrl(url) });
  });
}

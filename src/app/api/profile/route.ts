import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, toObject, withAuth } from "@/lib/api";
import {
  AdminProfile,
  CandidateProfile,
  RecruiterProfile,
  User,
} from "@/models";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function GET() {
  return withAuth(null, async (user) => {
    const account = await User.findById(user.id).select("-passwordHash").lean();
    if (!account) return jsonError("User not found", 404);

    let profile = null;
    let recruiterAvailability = null;
    if (user.role === "admin") {
      profile = await AdminProfile.findOne({ userId: user.id }).lean();
    } else if (user.role === "recruiter") {
      profile = await RecruiterProfile.findOne({ userId: user.id }).lean();
    } else if (user.role === "candidate") {
      profile = await CandidateProfile.findOne({ userId: user.id }).lean();
      if (profile) {
        const preferTech =
          profile.status === "hr_pass" ||
          profile.status === "tech_pass" ||
          profile.status === "scheduled";
        const recruiterUserId =
          preferTech && profile.techRecruiterId
            ? profile.techRecruiterId
            : profile.recruiterId;
        if (recruiterUserId) {
          const rp = await RecruiterProfile.findOne({ userId: recruiterUserId })
            .select("name timezone availableWeekdays availableFrom availableTo recruiterType")
            .lean();
          if (rp) {
            recruiterAvailability = toObject({
              ...rp,
              timezone: rp.timezone || "America/New_York",
              availableWeekdays: rp.availableWeekdays?.length
                ? rp.availableWeekdays
                : [1, 2, 3, 4, 5],
              availableFrom: rp.availableFrom || "09:00",
              availableTo: rp.availableTo || "17:00",
            });
          }
        }
      }
    }

    return jsonOk({
      user: toObject(account),
      profile: toObject(profile),
      recruiterAvailability,
    });
  });
}

const schema = z.object({
  username: z.string().optional(),
  avatarUrl: z.string().optional(),
  phone: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  // admin
  companyName: z.string().optional(),
  companyDescription: z.string().optional(),
  companyWebsiteUrl: z.string().optional(),
  calendlyUrl: z.string().optional(),
  offerLetterTemplateHtml: z.string().optional(),
  // recruiter
  location: z.string().optional(),
  googleMeetDefaultLink: z.string().optional(),
  timezone: z.string().optional(),
  availableWeekdays: z.array(z.number().min(0).max(6)).optional(),
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
  // candidate
  whatsapp: z.string().optional(),
  birthday: z.string().optional(),
  linkedinUrl: z.string().optional(),
  resumeUrl: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  majorStack: z.string().optional(),
  experienceYears: z.number().optional(),
});

export async function PUT(req: NextRequest) {
  return withAuth(null, async (user) => {
    const body = schema.parse(await req.json());
    const account = await User.findById(user.id);
    if (!account) return jsonError("User not found", 404);

    if (body.username) account.username = body.username;
    if (body.avatarUrl) account.avatarUrl = body.avatarUrl;
    if (body.phone) account.phone = body.phone;

    if (body.newPassword) {
      if (!body.currentPassword) return jsonError("Current password required");
      const ok = await verifyPassword(body.currentPassword, account.passwordHash);
      if (!ok) return jsonError("Current password is incorrect", 400);
      account.passwordHash = await hashPassword(body.newPassword);
    }
    await account.save();

    if (user.role === "admin") {
      const profile = await AdminProfile.findOneAndUpdate(
        { userId: user.id },
        {
          $set: {
            companyName: body.companyName,
            companyDescription: body.companyDescription,
            companyWebsiteUrl: body.companyWebsiteUrl,
            calendlyUrl: body.calendlyUrl,
            offerLetterTemplateHtml: body.offerLetterTemplateHtml,
          },
        },
        { new: true }
      );
      return jsonOk({
        user: toObject(await User.findById(user.id).select("-passwordHash")),
        profile: toObject(profile),
      });
    }

    if (user.role === "recruiter") {
      const profile = await RecruiterProfile.findOneAndUpdate(
        { userId: user.id },
        {
          $set: {
            name: body.username || account.username,
            phone: body.phone,
            location: body.location,
            calendlyUrl: body.calendlyUrl,
            googleMeetDefaultLink: body.googleMeetDefaultLink,
            timezone: body.timezone,
            availableWeekdays: body.availableWeekdays,
            availableFrom: body.availableFrom,
            availableTo: body.availableTo,
          },
        },
        { new: true }
      );
      return jsonOk({
        user: toObject(await User.findById(user.id).select("-passwordHash")),
        profile: toObject(profile),
      });
    }

    if (user.role === "candidate") {
      const profile = await CandidateProfile.findOneAndUpdate(
        { userId: user.id },
        {
          $set: {
            name: body.username || account.username,
            whatsapp: body.whatsapp,
            phone: body.phone || body.whatsapp,
            birthday: body.birthday ? new Date(body.birthday) : undefined,
            location: body.location,
            linkedinUrl: body.linkedinUrl,
            resumeUrl: body.resumeUrl,
            techStack: body.techStack,
            majorStack: body.majorStack,
            experienceYears: body.experienceYears,
          },
        },
        { new: true }
      );
      return jsonOk({
        user: toObject(await User.findById(user.id).select("-passwordHash")),
        profile: toObject(profile),
      });
    }

    return jsonOk({
      user: toObject(await User.findById(user.id).select("-passwordHash")),
      profile: null,
    });
  });
}

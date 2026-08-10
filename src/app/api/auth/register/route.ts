import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { attachSessionCookie } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import {
  User,
  AdminProfile,
  RecruiterProfile,
  CandidateProfile,
  NotificationTemplate,
} from "@/models";
import { DEFAULT_NOTIFICATION_TEMPLATES } from "@/data/sample-messages";
import { NextResponse } from "next/server";

const schema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "recruiter", "candidate"]),
  // admin
  companyName: z.string().optional(),
  companyDescription: z.string().optional(),
  companyWebsiteUrl: z.string().optional(),
  calendlyUrl: z.string().optional(),
  // recruiter
  recruiterType: z.enum(["hr", "tech"]).optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  adminInviteCode: z.string().optional(),
  // candidate
  whatsapp: z.string().optional(),
  birthday: z.string().optional(),
  linkedinUrl: z.string().optional(),
  resumeUrl: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  experienceYears: z.number().optional(),
  majorStack: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = schema.parse(await req.json());

    const exists = await User.findOne({ email: body.email.toLowerCase() });
    if (exists) return jsonError("Email already registered", 409);

    let adminId = undefined as undefined | string;

    if (body.role === "recruiter" || body.role === "candidate") {
      if (body.adminInviteCode) {
        const admin = await User.findOne({
          _id: body.adminInviteCode,
          role: "admin",
          status: "active",
        });
        if (!admin) return jsonError("Invalid admin invite code", 400);
        adminId = String(admin._id);
      }
    }

    const user = await User.create({
      username: body.username,
      email: body.email.toLowerCase(),
      passwordHash: await hashPassword(body.password),
      role: body.role,
      status: body.role === "recruiter" ? "invited" : "active",
      phone: body.phone || body.whatsapp,
      adminId,
      recruiterType: body.role === "recruiter" ? body.recruiterType || "hr" : undefined,
      avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(body.username)}`,
    });

    if (body.role === "admin") {
      await AdminProfile.create({
        userId: user._id,
        companyName: body.companyName || `${body.username}'s Company`,
        companyDescription: body.companyDescription,
        companyWebsiteUrl: body.companyWebsiteUrl,
        calendlyUrl: body.calendlyUrl,
        offerLetterTemplateHtml: `<h2>Offer Letter</h2><p>Dear {{candidateName}},</p><p>We are pleased to offer you a position at {{companyName}}.</p>`,
      });
    }

    if (body.role === "recruiter") {
      if (!adminId) {
        // Attach to first admin if present for demo friendliness
        const firstAdmin = await User.findOne({ role: "admin", status: "active" });
        if (firstAdmin) {
          user.adminId = firstAdmin._id;
          await user.save();
          adminId = String(firstAdmin._id);
        }
      }

      await RecruiterProfile.create({
        userId: user._id,
        adminId: adminId || user._id,
        name: body.username,
        email: body.email.toLowerCase(),
        phone: body.phone,
        location: body.location,
        recruiterType: body.recruiterType || "hr",
        status: "invited",
        calendlyUrl: body.calendlyUrl,
        activeStartDate: new Date(),
      });

      await Promise.all(
        (Object.keys(DEFAULT_NOTIFICATION_TEMPLATES) as Array<
          keyof typeof DEFAULT_NOTIFICATION_TEMPLATES
        >).map((type) =>
          NotificationTemplate.create({
            userId: user._id,
            type,
            subject: DEFAULT_NOTIFICATION_TEMPLATES[type].subject,
            body: DEFAULT_NOTIFICATION_TEMPLATES[type].body,
          })
        )
      );
    }

    if (body.role === "candidate") {
      if (!adminId) {
        const firstAdmin = await User.findOne({ role: "admin", status: "active" });
        if (firstAdmin) {
          user.adminId = firstAdmin._id;
          await user.save();
          adminId = String(firstAdmin._id);
        }
      }

      await CandidateProfile.create({
        userId: user._id,
        adminId,
        name: body.username,
        email: body.email.toLowerCase(),
        whatsapp: body.whatsapp,
        phone: body.phone || body.whatsapp,
        birthday: body.birthday ? new Date(body.birthday) : undefined,
        location: body.location,
        linkedinUrl: body.linkedinUrl,
        resumeUrl: body.resumeUrl,
        techStack: body.techStack || [],
        majorStack: body.majorStack || body.techStack?.[0],
        experienceYears: body.experienceYears || 0,
        status: "need_to_connect",
        statusHistory: [{ status: "need_to_connect", at: new Date() }],
      });
    }

    const authUser = {
      id: String(user._id),
      email: user.email,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
      adminId: user.adminId ? String(user.adminId) : undefined,
      recruiterType: user.recruiterType,
    };

    const token = await signToken(authUser);
    const res = NextResponse.json({ user: authUser });
    return attachSessionCookie(res, token);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Validation failed", 400, error.flatten());
    }
    console.error(error);
    return jsonError(error instanceof Error ? error.message : "Register failed", 500);
  }
}

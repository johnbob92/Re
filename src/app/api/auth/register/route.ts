import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { attachSessionCookie } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { User, CandidateProfile } from "@/models";

/** Public registration is candidate-only. Admin/recruiter roles are assigned by Super Admin. */
const schema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  location: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  birthday: z.string().optional(),
  linkedinUrl: z.string().optional(),
  resumeUrl: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  experienceYears: z.number().optional(),
  majorStack: z.string().optional(),
  adminInviteCode: z.string().optional(),
  // Reject legacy self-serve role escalation attempts
  role: z.enum(["candidate"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit({
      key: clientKey(req, "register"),
      limit: 10,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return jsonError("Too many registration attempts. Try again shortly.", 429);
    }

    await connectDB();
    const raw = await req.json();
    if (raw?.role && raw.role !== "candidate") {
      return jsonError(
        "Public registration is for candidates only. Ask a Super Admin to create admin/recruiter accounts.",
        403
      );
    }

    const body = schema.parse(raw);

    const exists = await User.findOne({ email: body.email.toLowerCase() });
    if (exists) return jsonError("Email already registered", 409);

    let adminId = undefined as undefined | string;
    if (body.adminInviteCode) {
      const admin = await User.findOne({
        _id: body.adminInviteCode,
        role: "admin",
        status: "active",
      });
      if (!admin) return jsonError("Invalid admin invite code", 400);
      adminId = String(admin._id);
    } else {
      const firstAdmin = await User.findOne({ role: "admin", status: "active" });
      if (firstAdmin) adminId = String(firstAdmin._id);
    }

    const user = await User.create({
      username: body.username,
      email: body.email.toLowerCase(),
      passwordHash: await hashPassword(body.password),
      role: "candidate",
      status: "active",
      phone: body.phone || body.whatsapp,
      adminId,
      avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(body.username)}`,
    });

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

    const authUser = {
      id: String(user._id),
      email: user.email,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
      adminId: user.adminId ? String(user.adminId) : undefined,
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

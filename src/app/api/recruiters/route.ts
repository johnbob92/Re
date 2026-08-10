import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, toObject, withAuth } from "@/lib/api";
import { RecruiterProfile, User } from "@/models";
import { hashPassword } from "@/lib/auth/password";

export async function GET(req: NextRequest) {
  return withAuth(["admin", "superadmin"], async (user) => {
    const { searchParams } = new URL(req.url);
    const performanceView = searchParams.get("performanceView") || "total";
    const filter: Record<string, unknown> =
      user.role === "admin" ? { adminId: user.id } : {};

    const items = await RecruiterProfile.find(filter)
      .populate("userId", "username avatarUrl status lastLoginAt")
      .sort({ createdAt: -1 })
      .lean();

    const mapped = items.map((r) => ({
      ...r,
      performance:
        performanceView === "weekly"
          ? r.hiredWeekly
          : performanceView === "monthly"
            ? r.hiredMonthly
            : r.hiredTotal,
      performanceView,
    }));

    return jsonOk({ items: toObject(mapped) });
  });
}

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  recruiterType: z.enum(["hr", "tech"]),
  salaryType: z.enum(["monthly", "hourly"]).default("monthly"),
  salaryRate: z.number().default(0),
  paid: z.boolean().default(false),
  status: z.enum(["active", "decline", "invited"]).default("invited"),
  calendlyUrl: z.string().optional(),
  password: z.string().min(8).default("Recruiter123!"),
});

export async function POST(req: NextRequest) {
  return withAuth(["admin"], async (user) => {
    const body = createSchema.parse(await req.json());
    const exists = await User.findOne({ email: body.email.toLowerCase() });
    if (exists) return jsonError("Email already exists", 409);

    const account = await User.create({
      username: body.name,
      email: body.email.toLowerCase(),
      passwordHash: await hashPassword(body.password),
      role: "recruiter",
      status: body.status === "active" ? "active" : "invited",
      phone: body.phone,
      adminId: user.id,
      recruiterType: body.recruiterType,
      avatarUrl: `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(body.name)}`,
    });

    const profile = await RecruiterProfile.create({
      userId: account._id,
      adminId: user.id,
      name: body.name,
      email: body.email.toLowerCase(),
      phone: body.phone,
      location: body.location,
      recruiterType: body.recruiterType,
      status: body.status,
      salaryType: body.salaryType,
      salaryRate: body.salaryRate,
      paid: body.paid,
      calendlyUrl: body.calendlyUrl,
      activeStartDate: new Date(),
    });

    return jsonOk({ item: toObject(profile) }, { status: 201 });
  });
}

const patchSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  recruiterType: z.enum(["hr", "tech"]).optional(),
  status: z.enum(["active", "decline", "invited"]).optional(),
  salaryType: z.enum(["monthly", "hourly"]).optional(),
  salaryRate: z.number().optional(),
  paid: z.boolean().optional(),
  calendlyUrl: z.string().optional(),
  activeStartDate: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  return withAuth(["admin"], async (user) => {
    const body = patchSchema.parse(await req.json());
    const profile = await RecruiterProfile.findOne({ _id: body.id, adminId: user.id });
    if (!profile) return jsonError("Recruiter not found", 404);

    Object.assign(profile, {
      ...body,
      id: undefined,
      activeStartDate: body.activeStartDate
        ? new Date(body.activeStartDate)
        : profile.activeStartDate,
    });
    await profile.save();

    if (body.status) {
      await User.findByIdAndUpdate(profile.userId, {
        status:
          body.status === "active"
            ? "active"
            : body.status === "decline"
              ? "declined"
              : "invited",
        recruiterType: body.recruiterType || undefined,
      });
    }

    return jsonOk({ item: toObject(profile) });
  });
}

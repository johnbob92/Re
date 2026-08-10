import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { User } from "@/models";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { attachSessionCookie } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit({
      key: clientKey(req, "login"),
      limit: 20,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return jsonError("Too many login attempts. Try again in a minute.", 429);
    }

    await connectDB();
    const body = schema.parse(await req.json());
    const user = await User.findOne({ email: body.email.toLowerCase() });

    if (!user || user.status === "deleted") {
      return jsonError("Invalid email or password", 401);
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) return jsonError("Invalid email or password", 401);

    user.lastLoginAt = new Date();
    await user.save();

    const authUser = {
      id: String(user._id),
      email: user.email,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
      adminId: user.adminId ? String(user.adminId) : undefined,
      recruiterType: user.recruiterType,
    };

    await writeAudit({
      actor: authUser,
      action: "auth.login",
      entityType: "user",
      entityId: user._id,
      summary: `${user.username} signed in`,
      adminId: user.adminId || (user.role === "admin" ? user._id : undefined),
      ip: req.headers.get("x-forwarded-for") || undefined,
    });

    const token = await signToken(authUser);
    const res = NextResponse.json({ user: authUser });
    return attachSessionCookie(res, token);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Validation failed", 400, error.flatten());
    }
    return jsonError("Login failed", 500);
  }
}

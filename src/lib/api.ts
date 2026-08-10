import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requireRole } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongodb";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import type { AuthUser, UserRole } from "@/types";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function withAuth(
  roles: UserRole[] | null,
  handler: (user: AuthUser, req?: NextRequest) => Promise<NextResponse>,
  options?: {
    req?: NextRequest;
    rateLimit?: { limit: number; windowMs: number; suffix?: string };
  }
) {
  try {
    if (options?.req && options.rateLimit) {
      const key = clientKey(
        options.req,
        options.rateLimit.suffix || `auth:${roles?.join(",") || "any"}`
      );
      const limited = rateLimit({
        key,
        limit: options.rateLimit.limit,
        windowMs: options.rateLimit.windowMs,
      });
      if (!limited.ok) {
        return jsonError("Too many requests. Please try again shortly.", 429, {
          resetAt: limited.resetAt,
        });
      }
    }

    await connectDB();
    const user = await getSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (roles) requireRole(user, roles);
    return await handler(user, options?.req);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return jsonError("Forbidden", 403);
    }
    console.error(error);
    return jsonError(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}

export function toObject(doc: unknown) {
  return JSON.parse(JSON.stringify(doc));
}

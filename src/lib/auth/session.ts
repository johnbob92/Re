import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, signToken, verifyToken } from "./jwt";
import type { AuthUser } from "@/types";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export async function setSessionCookie(user: AuthUser) {
  const token = await signToken(user);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, COOKIE_OPTIONS);
  return token;
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.id) return null;
  return {
    id: payload.id,
    email: payload.email,
    username: payload.username,
    role: payload.role,
    avatarUrl: payload.avatarUrl,
    adminId: payload.adminId,
    recruiterType: payload.recruiterType,
  };
}

export function attachSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
  return res;
}

export async function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function requireRole(user: AuthUser | null, roles: AuthUser["role"][]) {
  if (!user || !roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
}

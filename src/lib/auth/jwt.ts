import { SignJWT, jwtVerify } from "jose";
import type { AuthUser, JwtPayload } from "@/types";

const COOKIE_NAME = "hireflow_token";

function getSecret() {
  const secret = process.env.JWT_SECRET || "dev-only-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function signToken(user: AuthUser, expiresIn = "7d") {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };

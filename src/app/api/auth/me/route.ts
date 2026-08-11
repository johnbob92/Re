import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Soft session probe — always 200.
 * Returns `{ user: null }` when logged out so the client boot path
 * does not flood the console with expected 401s.
 */
export async function GET() {
  try {
    await connectDB();
    const user = await getSessionUser();
    return NextResponse.json({ user: user ?? null });
  } catch (error) {
    console.error("[auth/me]", error);
    return NextResponse.json({ user: null });
  }
}

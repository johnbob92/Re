import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth/jwt";

const PUBLIC = ["/", "/login", "/register", "/api/auth/login", "/api/auth/register", "/api/seed"];

const ROLE_HOME = {
  superadmin: "/superadmin/dashboard",
  admin: "/admin/candidates",
  recruiter: "/recruiter/connected",
  candidate: "/candidate/state",
} as const;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublic =
    PUBLIC.includes(pathname) ||
    pathname.startsWith("/api/integrations/") ||
    pathname.startsWith("/api/seed");

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user && !isPublic && (pathname.startsWith("/api/") || !pathname.startsWith("/api"))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[user.role];
    return NextResponse.redirect(url);
  }

  if (user) {
    const rolePrefix = `/${user.role === "superadmin" ? "superadmin" : user.role}`;
    const protectedPrefixes = ["/superadmin", "/admin", "/recruiter", "/candidate"];
    const hitsProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
    if (hitsProtected && !pathname.startsWith(rolePrefix)) {
      const url = req.nextUrl.clone();
      url.pathname = ROLE_HOME[user.role];
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

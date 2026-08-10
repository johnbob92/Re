import type { UserRole } from "@/types";

export type Permission =
  | "users.manage"
  | "dashboard.global"
  | "recruiters.manage"
  | "candidates.manage"
  | "candidates.import"
  | "offers.manage"
  | "offers.respond"
  | "assessments.write"
  | "interviews.manage"
  | "messages.view"
  | "activity.view"
  | "analytics.view"
  | "integrations.manage"
  | "chat.use"
  | "profile.self";

const MATRIX: Record<UserRole, Permission[]> = {
  superadmin: [
    "users.manage",
    "dashboard.global",
    "activity.view",
    "profile.self",
  ],
  admin: [
    "recruiters.manage",
    "candidates.manage",
    "candidates.import",
    "offers.manage",
    "interviews.manage",
    "messages.view",
    "activity.view",
    "analytics.view",
    "integrations.manage",
    "chat.use",
    "profile.self",
  ],
  recruiter: [
    "assessments.write",
    "interviews.manage",
    "messages.view",
    "chat.use",
    "profile.self",
  ],
  candidate: ["offers.respond", "interviews.manage", "chat.use", "profile.self"],
};

export function permissionsFor(role: UserRole): Permission[] {
  return MATRIX[role] || [];
}

export function can(role: UserRole, permission: Permission) {
  return permissionsFor(role).includes(permission);
}

export function assertCan(role: UserRole, permission: Permission) {
  if (!can(role, permission)) {
    throw new Error("FORBIDDEN");
  }
}

/** Useful for route guards / docs / tests */
export const ROLE_HOME: Record<UserRole, string> = {
  superadmin: "/superadmin/dashboard",
  admin: "/admin/dashboard",
  recruiter: "/recruiter/connected",
  candidate: "/candidate/state",
};

export const ROLE_PREFIX: Record<UserRole, string> = {
  superadmin: "/superadmin",
  admin: "/admin",
  recruiter: "/recruiter",
  candidate: "/candidate",
};

export function canAccessPath(role: UserRole, pathname: string) {
  const protectedPrefixes = ["/superadmin", "/admin", "/recruiter", "/candidate"];
  const hits = protectedPrefixes.some((p) => pathname.startsWith(p));
  if (!hits) return true;
  return pathname.startsWith(ROLE_PREFIX[role]);
}

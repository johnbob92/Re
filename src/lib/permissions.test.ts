import { describe, expect, it } from "vitest";
import {
  can,
  canAccessPath,
  permissionsFor,
  ROLE_HOME,
} from "@/lib/permissions";

describe("role permission matrix", () => {
  it("gives superadmin user management and global dashboard", () => {
    expect(can("superadmin", "users.manage")).toBe(true);
    expect(can("superadmin", "dashboard.global")).toBe(true);
    expect(can("superadmin", "offers.manage")).toBe(false);
  });

  it("gives admin hiring ops permissions", () => {
    const perms = permissionsFor("admin");
    expect(perms).toContain("candidates.manage");
    expect(perms).toContain("candidates.import");
    expect(perms).toContain("offers.manage");
    expect(perms).toContain("recruiters.manage");
    expect(perms).toContain("analytics.view");
    expect(can("admin", "users.manage")).toBe(false);
  });

  it("gives recruiter assessment write but not import", () => {
    expect(can("recruiter", "assessments.write")).toBe(true);
    expect(can("recruiter", "messages.view")).toBe(true);
    expect(can("recruiter", "candidates.import")).toBe(false);
  });

  it("gives candidate offer respond permission", () => {
    expect(can("candidate", "offers.respond")).toBe(true);
    expect(can("candidate", "offers.manage")).toBe(false);
    expect(can("candidate", "assessments.write")).toBe(false);
  });

  it("restricts dashboard path prefixes by role", () => {
    expect(canAccessPath("admin", "/admin/candidates")).toBe(true);
    expect(canAccessPath("admin", "/recruiter/connected")).toBe(false);
    expect(canAccessPath("candidate", "/candidate/offers")).toBe(true);
    expect(canAccessPath("candidate", "/admin/offers")).toBe(false);
    expect(canAccessPath("recruiter", "/login")).toBe(true);
  });

  it("maps each role to a home route", () => {
    expect(ROLE_HOME.superadmin).toBe("/superadmin/dashboard");
    expect(ROLE_HOME.admin).toBe("/admin/dashboard");
    expect(ROLE_HOME.recruiter).toBe("/recruiter/connected");
    expect(ROLE_HOME.candidate).toBe("/candidate/state");
  });
});

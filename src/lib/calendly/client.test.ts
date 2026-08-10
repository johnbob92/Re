import { describe, expect, it } from "vitest";
import { calendlyEmbedUrl, isDemoCalendlyUrl, normalizeCalendlyUrl } from "./client";

describe("calendly client helpers", () => {
  it("normalizes bare usernames", () => {
    expect(normalizeCalendlyUrl("acme/intro")).toBe("https://calendly.com/acme/intro");
  });

  it("detects demo URLs", () => {
    expect(isDemoCalendlyUrl("https://calendly.com/hireflow-demo")).toBe(true);
    expect(isDemoCalendlyUrl("https://calendly.com/real-user/30min")).toBe(false);
  });

  it("returns empty embed for demo URLs", () => {
    expect(calendlyEmbedUrl("https://calendly.com/hireflow-demo")).toBe("");
  });

  it("appends embed params without breaking existing query strings", () => {
    const url = calendlyEmbedUrl("https://calendly.com/acme/intro?month=2026-06");
    expect(url).toContain("month=2026-06");
    expect(url).toContain("hide_gdpr_banner=1");
    expect(url).toContain("primary_color=2563eb");
  });
});

import { describe, expect, it } from "vitest";
import {
  isWithinAvailability,
  parseTimeToMinutes,
  rangesOverlap,
  zonedWeekdayAndMinutes,
} from "./availability";

describe("parseTimeToMinutes", () => {
  it("parses HH:mm", () => {
    expect(parseTimeToMinutes("09:00")).toBe(540);
    expect(parseTimeToMinutes("17:30")).toBe(1050);
  });

  it("rejects invalid values", () => {
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(parseTimeToMinutes("abc")).toBeNull();
  });
});

describe("zonedWeekdayAndMinutes", () => {
  it("converts a UTC instant into America/New_York local parts", () => {
    // 2026-06-15 14:00 UTC = 10:00 AM EDT (weekday Mon=1)
    const date = new Date("2026-06-15T14:00:00.000Z");
    const local = zonedWeekdayAndMinutes(date, "America/New_York");
    expect(local.weekday).toBe(1);
    expect(local.minutes).toBe(10 * 60);
  });
});

describe("isWithinAvailability", () => {
  const window = {
    timezone: "America/New_York",
    availableWeekdays: [1, 2, 3, 4, 5],
    availableFrom: "09:00",
    availableTo: "17:00",
  };

  it("allows weekday inside hours", () => {
    const start = new Date("2026-06-15T14:00:00.000Z"); // Mon 10:00 ET
    expect(isWithinAvailability(start, window)).toEqual({ ok: true });
  });

  it("rejects weekend", () => {
    const start = new Date("2026-06-13T14:00:00.000Z"); // Sat 10:00 ET
    const result = isWithinAvailability(start, window);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/unavailable on Sat/i);
  });

  it("rejects after hours", () => {
    const start = new Date("2026-06-15T22:00:00.000Z"); // Mon 18:00 ET
    const result = isWithinAvailability(start, window);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/outside recruiter hours/i);
  });
});

describe("rangesOverlap", () => {
  it("detects overlapping intervals", () => {
    const aStart = new Date("2026-01-01T10:00:00Z");
    const aEnd = new Date("2026-01-01T11:00:00Z");
    const bStart = new Date("2026-01-01T10:30:00Z");
    const bEnd = new Date("2026-01-01T11:30:00Z");
    expect(rangesOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it("allows adjacent non-overlapping intervals", () => {
    const aStart = new Date("2026-01-01T10:00:00Z");
    const aEnd = new Date("2026-01-01T11:00:00Z");
    const bStart = new Date("2026-01-01T11:00:00Z");
    const bEnd = new Date("2026-01-01T12:00:00Z");
    expect(rangesOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });
});

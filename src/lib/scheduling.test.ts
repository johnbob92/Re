import { beforeEach, describe, expect, it, vi } from "vitest";

const interviewFind = vi.fn();
const recruiterFindOne = vi.fn();

vi.mock("@/models", () => ({
  Interview: { find: (...args: unknown[]) => interviewFind(...args) },
  RecruiterProfile: { findOne: (...args: unknown[]) => recruiterFindOne(...args) },
}));

import { assertRecruiterSlotAvailable } from "./scheduling";

function leanChain(result: unknown) {
  return {
    select: () => ({
      lean: async () => result,
    }),
    lean: async () => result,
  };
}

describe("assertRecruiterSlotAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects times outside recruiter availability window", async () => {
    recruiterFindOne.mockReturnValue(
      leanChain({
        timezone: "America/New_York",
        availableWeekdays: [1, 2, 3, 4, 5],
        availableFrom: "09:00",
        availableTo: "17:00",
      })
    );
    interviewFind.mockReturnValue(leanChain([]));

    // Sunday 10:00 ET
    const result = await assertRecruiterSlotAvailable({
      recruiterUserId: "rec-1",
      start: new Date("2026-06-14T14:00:00.000Z"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/unavailable on Sun/i);
  });

  it("rejects overlapping interviews", async () => {
    recruiterFindOne.mockReturnValue(
      leanChain({
        timezone: "America/New_York",
        availableWeekdays: [1, 2, 3, 4, 5],
        availableFrom: "09:00",
        availableTo: "17:00",
      })
    );
    interviewFind.mockReturnValue(
      leanChain([
        {
          _id: "int-existing",
          scheduledAt: new Date("2026-06-15T14:00:00.000Z"),
          endsAt: new Date("2026-06-15T14:45:00.000Z"),
        },
      ])
    );

    const result = await assertRecruiterSlotAvailable({
      recruiterUserId: "rec-1",
      start: new Date("2026-06-15T14:15:00.000Z"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/already has an interview/i);
  });

  it("allows reschedule when ignoring the same interview id", async () => {
    recruiterFindOne.mockReturnValue(
      leanChain({
        timezone: "America/New_York",
        availableWeekdays: [1, 2, 3, 4, 5],
        availableFrom: "09:00",
        availableTo: "17:00",
      })
    );
    interviewFind.mockReturnValue(
      leanChain([
        {
          _id: "int-self",
          scheduledAt: new Date("2026-06-15T14:00:00.000Z"),
          endsAt: new Date("2026-06-15T14:45:00.000Z"),
        },
      ])
    );

    const result = await assertRecruiterSlotAvailable({
      recruiterUserId: "rec-1",
      start: new Date("2026-06-15T14:00:00.000Z"),
      ignoreInterviewId: "int-self",
    });
    expect(result).toEqual({ ok: true });
  });

  it("skips availability window when recruiter profile is missing (admin final)", async () => {
    recruiterFindOne.mockReturnValue(leanChain(null));
    interviewFind.mockReturnValue(leanChain([]));

    const result = await assertRecruiterSlotAvailable({
      recruiterUserId: "admin-1",
      start: new Date("2026-06-14T14:00:00.000Z"), // Sunday OK without profile
    });
    expect(result).toEqual({ ok: true });
  });
});

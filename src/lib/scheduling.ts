import { addMinutes } from "date-fns";
import { Interview, RecruiterProfile } from "@/models";
import {
  isWithinAvailability,
  rangesOverlap,
  type AvailabilityCheckResult,
} from "@/lib/availability";

/**
 * Ensure the recruiter is free and within their configured availability window.
 */
export async function assertRecruiterSlotAvailable(params: {
  recruiterUserId: string;
  start: Date;
  durationMinutes?: number;
  ignoreInterviewId?: string;
}): Promise<AvailabilityCheckResult> {
  const duration = params.durationMinutes ?? 45;
  const end = addMinutes(params.start, duration);

  const profile = await RecruiterProfile.findOne({
    userId: params.recruiterUserId,
  }).lean();

  // Admins (final interviews) may not have a recruiter profile — skip window check.
  if (profile) {
    const windowCheck = isWithinAvailability(params.start, {
      timezone: profile.timezone,
      availableWeekdays: profile.availableWeekdays,
      availableFrom: profile.availableFrom,
      availableTo: profile.availableTo,
    });
    if (!windowCheck.ok) return windowCheck;
  }

  const existing = await Interview.find({
    recruiterId: params.recruiterUserId,
    status: "scheduled",
    scheduledAt: {
      $lt: end,
      $gte: addMinutes(params.start, -duration),
    },
  })
    .select("_id scheduledAt endsAt")
    .lean();

  for (const item of existing) {
    if (
      params.ignoreInterviewId &&
      String(item._id) === params.ignoreInterviewId
    ) {
      continue;
    }
    const itemStart = new Date(item.scheduledAt);
    const itemEnd = item.endsAt
      ? new Date(item.endsAt)
      : addMinutes(itemStart, duration);
    if (rangesOverlap(params.start, end, itemStart, itemEnd)) {
      return {
        ok: false,
        reason: `Recruiter already has an interview at ${itemStart.toLocaleString()}`,
      };
    }
  }

  return { ok: true };
}

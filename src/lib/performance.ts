import { Types } from "mongoose";
import { RecruiterProfile } from "@/models";
import { isWithinLastDays, isWithinLastMonths } from "@/lib/utils/dates";

/** Increment denormalized hired counters when a candidate is marked hired. */
export async function bumpRecruiterHireStats(recruiterUserId?: string | Types.ObjectId | null) {
  if (!recruiterUserId) return;

  const profile = await RecruiterProfile.findOne({ userId: recruiterUserId });
  if (!profile) return;

  const now = new Date();
  // Refresh rolling windows opportunistically
  if (!profile.performanceUpdatedAt || !isWithinLastDays(profile.performanceUpdatedAt, 1)) {
    // Soft reset weekly/monthly if last update is stale beyond window edges
    if (!profile.performanceUpdatedAt || !isWithinLastDays(profile.performanceUpdatedAt, 7)) {
      profile.hiredWeekly = 0;
    }
    if (!profile.performanceUpdatedAt || !isWithinLastMonths(profile.performanceUpdatedAt, 1)) {
      profile.hiredMonthly = 0;
    }
  }

  profile.hiredTotal += 1;
  profile.hiredWeekly += 1;
  profile.hiredMonthly += 1;
  profile.performanceUpdatedAt = now;
  await profile.save();
}

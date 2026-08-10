import { Types } from "mongoose";
import { jsonOk, withAuth } from "@/lib/api";
import { CandidateProfile, Interview } from "@/models";
import type { CandidateStatus, DashboardStats } from "@/types";
import { subWeeks, startOfWeek, format } from "date-fns";

export async function GET() {
  return withAuth(["superadmin", "admin"], async (user) => {
    const scope =
      user.role === "admin" ? { adminId: new Types.ObjectId(user.id) } : {};

    const statuses: CandidateStatus[] = [
      "need_to_connect",
      "connected",
      "declined",
      "scheduled",
      "hr_pass",
      "hr_failed",
      "tech_pass",
      "tech_failed",
      "final_pass",
      "final_failed",
      "offer_sent",
      "hired",
    ];

    const [totalCandidates, grouped, candidates] = await Promise.all([
      CandidateProfile.countDocuments(scope),
      CandidateProfile.aggregate([
        { $match: scope },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      CandidateProfile.find(scope)
        .select("name email status location experienceYears hrScheduledAt techScheduledAt finalScheduledAt recruiterId updatedAt")
        .populate("recruiterId", "username email")
        .sort({ updatedAt: -1 })
        .limit(200)
        .lean(),
    ]);

    const countMap = Object.fromEntries(grouped.map((g) => [g._id, g.count]));
    const byStatus = statuses.map((status) => ({
      status,
      count: countMap[status] || 0,
    }));

    const weeklyTrend = [];
    for (let i = 5; i >= 0; i -= 1) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const weekEnd = startOfWeek(subWeeks(new Date(), i - 1), { weekStartsOn: 1 });
      const [scheduled, passed, failed] = await Promise.all([
        Interview.countDocuments({
          ...scope,
          scheduledAt: { $gte: weekStart, $lt: weekEnd },
        }),
        CandidateProfile.countDocuments({
          ...scope,
          status: { $in: ["hr_pass", "tech_pass", "final_pass", "hired", "offer_sent"] },
          updatedAt: { $gte: weekStart, $lt: weekEnd },
        }),
        CandidateProfile.countDocuments({
          ...scope,
          status: { $in: ["hr_failed", "tech_failed", "final_failed"] },
          updatedAt: { $gte: weekStart, $lt: weekEnd },
        }),
      ]);
      weeklyTrend.push({
        week: format(weekStart, "MMM d"),
        scheduled,
        passed,
        failed,
      });
    }

    const stats: DashboardStats = {
      totalCandidates,
      scheduled: countMap.scheduled || 0,
      hrPass: countMap.hr_pass || 0,
      hrFailed: countMap.hr_failed || 0,
      techPass: countMap.tech_pass || 0,
      techFailed: countMap.tech_failed || 0,
      finalPass: countMap.final_pass || 0,
      finalFailed: countMap.final_failed || 0,
      hired: countMap.hired || 0,
      byStatus,
      weeklyTrend,
    };

    return jsonOk({ stats, candidates });
  });
}

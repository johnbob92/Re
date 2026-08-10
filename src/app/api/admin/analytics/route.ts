import { Types } from "mongoose";
import { jsonOk, withAuth } from "@/lib/api";
import { Assessment, CandidateProfile, RecruiterProfile } from "@/models";
import { assertCan } from "@/lib/permissions";

export async function GET() {
  return withAuth(["admin"], async (user) => {
    assertCan(user.role, "analytics.view");
    const adminObjectId = new Types.ObjectId(user.id);

    const recruiters = await RecruiterProfile.find({ adminId: user.id })
      .select("userId name email recruiterType status hiredTotal hiredWeekly hiredMonthly")
      .lean();

    const byRecruiter = await Assessment.aggregate([
      { $match: { adminId: adminObjectId, decision: { $in: ["pass", "fail"] } } },
      {
        $group: {
          _id: { recruiterId: "$recruiterId", stage: "$stage", decision: "$decision" },
          count: { $sum: 1 },
        },
      },
    ]);

    const statusByRecruiter = await CandidateProfile.aggregate([
      { $match: { adminId: adminObjectId } },
      {
        $group: {
          _id: { recruiterId: "$recruiterId", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    const rows = recruiters.map((r) => {
      const userId = String(r.userId);
      let pass = 0;
      let fail = 0;
      const byStage: Record<string, { pass: number; fail: number }> = {
        hr: { pass: 0, fail: 0 },
        tech: { pass: 0, fail: 0 },
        final: { pass: 0, fail: 0 },
      };

      for (const row of byRecruiter) {
        if (String(row._id.recruiterId) !== userId) continue;
        const stage = String(row._id.stage) as "hr" | "tech" | "final";
        const decision = String(row._id.decision) as "pass" | "fail";
        if (!byStage[stage]) byStage[stage] = { pass: 0, fail: 0 };
        byStage[stage][decision] += row.count;
        if (decision === "pass") pass += row.count;
        else fail += row.count;
      }

      let activePipeline = 0;
      let hired = 0;
      for (const row of statusByRecruiter) {
        if (String(row._id.recruiterId) !== userId) continue;
        if (row._id.status === "hired") hired += row.count;
        else if (
          !["declined", "hr_failed", "tech_failed", "final_failed"].includes(
            String(row._id.status)
          )
        ) {
          activePipeline += row.count;
        }
      }

      const decided = pass + fail;
      const passRate = decided ? Math.round((pass / decided) * 1000) / 10 : 0;

      return {
        recruiterId: userId,
        name: r.name,
        email: r.email,
        recruiterType: r.recruiterType,
        status: r.status,
        pass,
        fail,
        decided,
        passRate,
        byStage,
        activePipeline,
        hired,
        hiredTotal: r.hiredTotal || 0,
        hiredWeekly: r.hiredWeekly || 0,
        hiredMonthly: r.hiredMonthly || 0,
      };
    });

    rows.sort((a, b) => b.passRate - a.passRate || b.decided - a.decided);

    const totals = rows.reduce(
      (acc, row) => {
        acc.pass += row.pass;
        acc.fail += row.fail;
        acc.hired += row.hired;
        acc.activePipeline += row.activePipeline;
        return acc;
      },
      { pass: 0, fail: 0, hired: 0, activePipeline: 0 }
    );
    const decided = totals.pass + totals.fail;

    return jsonOk({
      generatedAt: new Date().toISOString(),
      totals: {
        ...totals,
        decided,
        passRate: decided ? Math.round((totals.pass / decided) * 1000) / 10 : 0,
        recruiters: rows.length,
      },
      recruiters: rows,
      chart: rows.map((r) => ({
        name: r.name.split(" ")[0] || r.name,
        passRate: r.passRate,
        pass: r.pass,
        fail: r.fail,
        hired: r.hired,
      })),
    });
  });
}

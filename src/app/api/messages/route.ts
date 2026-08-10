import { NextRequest } from "next/server";
import { jsonOk, toObject, withAuth } from "@/lib/api";
import { MessageLog, User } from "@/models";

export async function GET(req: NextRequest) {
  return withAuth(["admin", "superadmin", "recruiter"], async (user) => {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status")?.trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") || 40));

    const filter: Record<string, unknown> = {};

    if (user.role === "recruiter") {
      filter.fromUserId = user.id;
    } else if (user.role === "admin") {
      const recruiters = await User.find({ adminId: user.id, role: "recruiter" })
        .select("_id")
        .lean();
      filter.fromUserId = {
        $in: [user.id, ...recruiters.map((r) => r._id)],
      };
    }

    if (status) filter.status = status;
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ toEmail: rx }, { subject: rx }, { type: rx }];
    }

    const [items, total] = await Promise.all([
      MessageLog.find(filter)
        .populate("fromUserId", "username email role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      MessageLog.countDocuments(filter),
    ]);

    return jsonOk({
      items: toObject(items),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  }, { req, rateLimit: { limit: 60, windowMs: 60_000, suffix: "messages" } });
}

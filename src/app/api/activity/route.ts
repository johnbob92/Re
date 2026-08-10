import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { jsonOk, toObject, withAuth } from "@/lib/api";
import { AuditLog, User } from "@/models";

export async function GET(req: NextRequest) {
  return withAuth(["admin", "superadmin"], async (user) => {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const action = searchParams.get("action")?.trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") || 40));

    const filter: Record<string, unknown> = {};
    if (user.role === "admin") {
      filter.adminId = new Types.ObjectId(user.id);
    }
    if (action) filter.action = action;
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.summary = rx;
    }

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actorId", "username email role avatarUrl")
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    // Helpful bootstrap: if empty for admin, create a system note once.
    if (!total && user.role === "admin") {
      const me = await User.findById(user.id).lean();
      if (me) {
        await AuditLog.create({
          actorId: user.id,
          actorRole: "admin",
          adminId: user.id,
          action: "system.ready",
          entityType: "system",
          summary: "Activity feed is ready. New hiring actions will appear here.",
        });
      }
    }

    const refreshed =
      !total && user.role === "admin"
        ? await AuditLog.find(filter)
            .populate("actorId", "username email role avatarUrl")
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .lean()
        : items;

    return jsonOk({
      items: toObject(refreshed),
      total: total || refreshed.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((total || refreshed.length) / pageSize)),
    });
  }, { req, rateLimit: { limit: 60, windowMs: 60_000, suffix: "activity" } });
}

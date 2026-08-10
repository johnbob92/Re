import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, toObject, withAuth } from "@/lib/api";
import { AppNotification } from "@/models";

export async function GET(req: NextRequest) {
  return withAuth(null, async (user) => {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const filter: Record<string, unknown> = { userId: user.id };
    if (unreadOnly) filter.readAt = null;

    const [items, unreadCount] = await Promise.all([
      AppNotification.find(filter).sort({ createdAt: -1 }).limit(40).lean(),
      AppNotification.countDocuments({ userId: user.id, readAt: null }),
    ]);

    return jsonOk({ items: toObject(items), unreadCount });
  }, { req, rateLimit: { limit: 90, windowMs: 60_000, suffix: "inbox" } });
}

const patchSchema = z.object({
  ids: z.array(z.string()).optional(),
  markAll: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  return withAuth(null, async (user) => {
    const body = patchSchema.parse(await req.json());
    const now = new Date();

    if (body.markAll) {
      await AppNotification.updateMany(
        { userId: user.id, readAt: null },
        { $set: { readAt: now } }
      );
      return jsonOk({ ok: true, markAll: true });
    }

    if (!body.ids?.length) return jsonError("ids or markAll required");
    await AppNotification.updateMany(
      { userId: user.id, _id: { $in: body.ids } },
      { $set: { readAt: now } }
    );
    return jsonOk({ ok: true, updated: body.ids.length });
  });
}

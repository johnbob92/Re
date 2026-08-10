import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, toObject, withAuth } from "@/lib/api";
import { User } from "@/models";
import { hashPassword } from "@/lib/auth/password";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  return withAuth(["superadmin"], async () => {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const q = searchParams.get("q");
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") || 25));

    const filter: Record<string, unknown> = { status: { $ne: "deleted" } };
    if (role) filter.role = role;
    if (q) filter.$text = { $search: q };

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ]);

    return jsonOk({
      items: toObject(items),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  });
}

const patchSchema = z.object({
  userId: z.string(),
  role: z.enum(["superadmin", "admin", "recruiter", "candidate"]).optional(),
  status: z.enum(["active", "inactive", "invited", "declined", "deleted"]).optional(),
  password: z.string().min(8).optional(),
  deleteAccount: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  return withAuth(["superadmin"], async (actor) => {
    const body = patchSchema.parse(await req.json());
    const user = await User.findById(body.userId);
    if (!user) return jsonError("User not found", 404);

    if (body.deleteAccount) {
      user.status = "deleted";
      user.email = `deleted+${user._id}@hireflow.local`;
      await user.save();
      await writeAudit({
        actor,
        action: "user.delete",
        entityType: "user",
        entityId: user._id,
        summary: `${actor.username} deleted account ${user.username}`,
      });
      return jsonOk({ ok: true, deleted: true });
    }

    if (body.role) user.role = body.role;
    if (body.status) user.status = body.status;
    if (body.password) user.passwordHash = await hashPassword(body.password);
    await user.save();

    await writeAudit({
      actor,
      action: "user.update",
      entityType: "user",
      entityId: user._id,
      summary: `${actor.username} updated ${user.username}`,
      meta: {
        role: body.role,
        status: body.status,
        passwordReset: Boolean(body.password),
      },
    });

    return jsonOk({ user: toObject(await User.findById(user._id).select("-passwordHash")) });
  });
}

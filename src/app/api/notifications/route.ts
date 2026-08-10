import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, toObject, withAuth } from "@/lib/api";
import { NotificationTemplate } from "@/models";
import { DEFAULT_NOTIFICATION_TEMPLATES } from "@/data/sample-messages";

export async function GET() {
  return withAuth(["recruiter", "admin"], async (user) => {
    let items = await NotificationTemplate.find({ userId: user.id }).lean();
    if (!items.length) {
      items = await Promise.all(
        (Object.keys(DEFAULT_NOTIFICATION_TEMPLATES) as Array<
          keyof typeof DEFAULT_NOTIFICATION_TEMPLATES
        >).map(async (type) =>
          NotificationTemplate.create({
            userId: user.id,
            type,
            subject: DEFAULT_NOTIFICATION_TEMPLATES[type].subject,
            body: DEFAULT_NOTIFICATION_TEMPLATES[type].body,
          }).then((d) => d.toObject())
        )
      );
    }
    return jsonOk({ items: toObject(items), defaults: DEFAULT_NOTIFICATION_TEMPLATES });
  });
}

const schema = z.object({
  type: z.enum([
    "reminder",
    "waiting",
    "passed",
    "failed",
    "tech_invite",
    "final_invite",
    "offer",
  ]),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function PUT(req: NextRequest) {
  return withAuth(["recruiter", "admin"], async (user) => {
    const body = schema.parse(await req.json());
    const item = await NotificationTemplate.findOneAndUpdate(
      { userId: user.id, type: body.type },
      { $set: body },
      { upsert: true, new: true }
    );
    return jsonOk({ item: toObject(item) });
  });
}

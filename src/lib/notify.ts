import { Types } from "mongoose";
import { AppNotification } from "@/models";

export async function notifyUser(input: {
  userId?: string | Types.ObjectId | null;
  title: string;
  body: string;
  type: string;
  href?: string;
  meta?: Record<string, unknown>;
}) {
  if (!input.userId) return null;
  try {
    return await AppNotification.create({
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type,
      href: input.href,
      meta: input.meta,
    });
  } catch (error) {
    console.error("[notify]", error);
    return null;
  }
}

export async function notifyMany(
  userIds: Array<string | Types.ObjectId | null | undefined>,
  payload: Omit<Parameters<typeof notifyUser>[0], "userId">
) {
  const unique = [...new Set(userIds.filter(Boolean).map(String))];
  await Promise.all(unique.map((userId) => notifyUser({ ...payload, userId })));
}

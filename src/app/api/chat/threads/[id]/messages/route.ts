import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, toObject, withAuth } from "@/lib/api";
import { CandidateProfile, ChatMessage, ChatThread } from "@/models";
import { assertCan } from "@/lib/permissions";
import { notifyUser } from "@/lib/notify";

async function getAccessibleThread(threadId: string, userId: string, role: string) {
  const thread = await ChatThread.findById(threadId);
  if (!thread) return null;
  if (role === "recruiter" && String(thread.recruiterId) !== userId) return null;
  if (role === "candidate" && String(thread.candidateUserId) !== userId) return null;
  if (role === "admin") {
    if (thread.adminId && String(thread.adminId) === userId) return thread;
    const owned = await CandidateProfile.exists({
      userId: thread.candidateUserId,
      adminId: userId,
    });
    if (!owned) return null;
  }
  return thread;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(["recruiter", "candidate", "admin"], async (user) => {
    assertCan(user.role, "chat.use");
    const { id } = await context.params;
    const thread = await getAccessibleThread(id, user.id, user.role);
    if (!thread) return jsonError("Thread not found", 404);

    const messages = await ChatMessage.find({ threadId: thread._id })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate("senderId", "username avatarUrl role")
      .lean();

    await ChatMessage.updateMany(
      {
        threadId: thread._id,
        senderId: { $ne: user.id },
        readBy: { $ne: user.id },
      },
      { $addToSet: { readBy: user.id } }
    );

    return jsonOk({
      thread: toObject(thread),
      items: toObject(messages),
    });
  });
}

const schema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(["recruiter", "candidate", "admin"], async (user) => {
    assertCan(user.role, "chat.use");
    if (user.role === "admin") {
      return jsonError("Admin chat oversight is read-only", 403);
    }
    const { id } = await context.params;
    const thread = await getAccessibleThread(id, user.id, user.role);
    if (!thread) return jsonError("Thread not found", 404);

    const body = schema.parse(await req.json());
    const message = await ChatMessage.create({
      threadId: thread._id,
      senderId: user.id,
      body: body.body,
      readBy: [user.id],
    });

    thread.lastMessageAt = new Date();
    thread.lastMessagePreview = body.body.slice(0, 140);
    await thread.save();

    const otherId =
      String(thread.recruiterId) === user.id
        ? thread.candidateUserId
        : thread.recruiterId;

    await notifyUser({
      userId: otherId,
      type: "chat.message",
      title: `Message from ${user.username}`,
      body: body.body.slice(0, 120),
      href:
        String(otherId) === String(thread.recruiterId)
          ? "/recruiter/chat"
          : "/candidate/chat",
      meta: { threadId: String(thread._id) },
    });

    const populated = await ChatMessage.findById(message._id)
      .populate("senderId", "username avatarUrl role")
      .lean();

    return jsonOk({ item: toObject(populated) }, { status: 201 });
  });
}

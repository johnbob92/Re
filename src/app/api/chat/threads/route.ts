import { NextRequest } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { jsonError, jsonOk, toObject, withAuth } from "@/lib/api";
import {
  CandidateProfile,
  ChatMessage,
  ChatThread,
  RecruiterProfile,
  User,
} from "@/models";
import { assertCan } from "@/lib/permissions";
import { notifyUser } from "@/lib/notify";

export async function GET() {
  return withAuth(["recruiter", "candidate", "admin"], async (user) => {
    assertCan(user.role, "chat.use");

    let threads;
    if (user.role === "recruiter") {
      threads = await ChatThread.find({ recruiterId: user.id })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .lean();
    } else if (user.role === "candidate") {
      threads = await ChatThread.find({ candidateUserId: user.id })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .lean();
    } else {
      // Admin: threads tagged with adminId, plus any involving their candidates
      const candidateUsers = await CandidateProfile.find({ adminId: user.id })
        .select("userId")
        .lean();
      const candidateUserIds = candidateUsers.map((c) => c.userId);
      threads = await ChatThread.find({
        $or: [{ adminId: user.id }, { candidateUserId: { $in: candidateUserIds } }],
      })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .lean();
    }

    const recruiterIds = [...new Set(threads.map((t) => String(t.recruiterId)))];
    const candidateIds = [...new Set(threads.map((t) => String(t.candidateUserId)))];

    const [recruiters, candidates, unread] = await Promise.all([
      User.find({ _id: { $in: recruiterIds } })
        .select("username email avatarUrl")
        .lean(),
      User.find({ _id: { $in: candidateIds } })
        .select("username email avatarUrl")
        .lean(),
      ChatMessage.aggregate([
        {
          $match: {
            threadId: { $in: threads.map((t) => t._id) },
            senderId: { $ne: new Types.ObjectId(user.id) },
            readBy: { $ne: new Types.ObjectId(user.id) },
          },
        },
        { $group: { _id: "$threadId", count: { $sum: 1 } } },
      ]),
    ]);

    const recruiterMap = Object.fromEntries(recruiters.map((r) => [String(r._id), r]));
    const candidateMap = Object.fromEntries(candidates.map((c) => [String(c._id), c]));
    const unreadMap = Object.fromEntries(unread.map((u) => [String(u._id), u.count]));

    const items = threads.map((t) => ({
      ...t,
      unreadCount: unreadMap[String(t._id)] || 0,
      recruiter: recruiterMap[String(t.recruiterId)] || null,
      candidate: candidateMap[String(t.candidateUserId)] || null,
    }));

    return jsonOk({ items: toObject(items) });
  });
}

const createSchema = z.object({
  candidateUserId: z.string().optional(),
  recruiterId: z.string().optional(),
  candidateProfileId: z.string().optional(),
});

/** Open or create a 1:1 thread between recruiter and candidate. */
export async function POST(req: NextRequest) {
  return withAuth(["recruiter", "candidate", "admin"], async (user) => {
    assertCan(user.role, "chat.use");
    const body = createSchema.parse(await req.json());

    let recruiterId = body.recruiterId;
    let candidateUserId = body.candidateUserId;
    let candidateProfileId = body.candidateProfileId;
    let adminId: string | undefined = user.adminId || (user.role === "admin" ? user.id : undefined);

    if (user.role === "recruiter") {
      recruiterId = user.id;
      adminId = user.adminId;
      if (!candidateUserId && body.candidateProfileId) {
        const profile = await CandidateProfile.findById(body.candidateProfileId).lean();
        if (!profile) return jsonError("Candidate not found", 404);
        candidateUserId = String(profile.userId);
        candidateProfileId = String(profile._id);
        adminId = profile.adminId ? String(profile.adminId) : adminId;
      }
    }

    if (user.role === "candidate") {
      candidateUserId = user.id;
      const profile = await CandidateProfile.findOne({ userId: user.id }).lean();
      if (!profile) return jsonError("Candidate profile not found", 404);
      candidateProfileId = String(profile._id);
      adminId = profile.adminId ? String(profile.adminId) : adminId;
      if (!recruiterId) {
        recruiterId = profile.recruiterId
          ? String(profile.recruiterId)
          : profile.techRecruiterId
            ? String(profile.techRecruiterId)
            : undefined;
      }
      if (!recruiterId) {
        const hr = await RecruiterProfile.findOne({
          adminId: profile.adminId,
          recruiterType: "hr",
          status: "active",
        }).lean();
        recruiterId = hr ? String(hr.userId) : undefined;
      }
    }

    if (user.role === "admin") {
      adminId = user.id;
      if (!recruiterId || !candidateUserId) {
        return jsonError("recruiterId and candidateUserId are required for admins");
      }
    }

    if (!recruiterId || !candidateUserId) {
      return jsonError("Unable to resolve recruiter and candidate for chat", 400);
    }

    let thread = await ChatThread.findOne({ recruiterId, candidateUserId });
    if (!thread) {
      thread = await ChatThread.create({
        recruiterId,
        candidateUserId,
        candidateProfileId,
        adminId,
        lastMessageAt: new Date(),
        lastMessagePreview: "Conversation started",
      });

      await ChatMessage.create({
        threadId: thread._id,
        senderId: user.id,
        body: "Hi! Starting our HireFlow chat.",
        readBy: [user.id],
      });

      const otherId = user.id === recruiterId ? candidateUserId : recruiterId;
      await notifyUser({
        userId: otherId,
        type: "chat.started",
        title: "New chat started",
        body: `${user.username} opened a conversation with you.`,
        href: user.role === "candidate" ? "/recruiter/chat" : "/candidate/chat",
      });
    }

    return jsonOk({ item: toObject(thread) }, { status: 201 });
  });
}

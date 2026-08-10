import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, toObject, withAuth } from "@/lib/api";
import { CandidateProfile, Connection } from "@/models";

export async function GET() {
  return withAuth(["recruiter"], async (user) => {
    const filter =
      user.recruiterType === "tech"
        ? { techRecruiterId: user.id }
        : { recruiterId: user.id };

    const candidates = await CandidateProfile.find({
      ...filter,
      status: { $nin: ["need_to_connect", "declined"] },
    })
      .sort({ updatedAt: -1 })
      .lean();

    const connections = await Connection.find({ recruiterId: user.id })
      .sort({ updatedAt: -1 })
      .lean();

    return jsonOk({
      candidates: toObject(candidates),
      connections: toObject(connections),
    });
  });
}

const schema = z.object({
  candidateId: z.string(),
  status: z.enum(["connected", "declined", "pending"]),
});

export async function POST(req: NextRequest) {
  return withAuth(["recruiter", "admin"], async (user) => {
    const body = schema.parse(await req.json());
    const candidate = await CandidateProfile.findById(body.candidateId);
    if (!candidate) return jsonError("Candidate not found", 404);

    const connection = await Connection.findOneAndUpdate(
      { recruiterId: user.id, candidateId: candidate._id },
      {
        $set: {
          adminId: candidate.adminId || user.adminId || user.id,
          status: body.status,
          connectedAt: body.status === "connected" ? new Date() : undefined,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    if (body.status === "connected") {
      if (user.recruiterType === "tech") candidate.techRecruiterId = user.id as unknown as never;
      else candidate.recruiterId = user.id as unknown as never;
      candidate.status = "connected";
      candidate.statusHistory.push({ status: "connected", at: new Date() });
      await candidate.save();
    }

    if (body.status === "declined") {
      candidate.status = "declined";
      candidate.statusHistory.push({ status: "declined", at: new Date() });
      await candidate.save();
    }

    return jsonOk({ item: toObject(connection) });
  });
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, withAuth } from "@/lib/api";
import { postSlackMessage } from "@/lib/slack/client";

export async function GET() {
  return withAuth(["admin", "recruiter", "superadmin"], async () =>
    jsonOk({
      connected: Boolean(process.env.SLACK_BOT_TOKEN),
      channel: process.env.SLACK_DEFAULT_CHANNEL || "#hiring",
    })
  );
}

const schema = z.object({
  text: z.string().min(1),
  channel: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(["admin", "recruiter", "superadmin"], async () => {
    const body = schema.parse(await req.json());
    const result = await postSlackMessage(body.text, body.channel);
    return jsonOk(result);
  });
}

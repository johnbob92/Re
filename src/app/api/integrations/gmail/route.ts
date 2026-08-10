import { jsonOk, withAuth } from "@/lib/api";
import { MessageLog } from "@/models";

export async function GET() {
  return withAuth(["admin", "recruiter", "superadmin"], async (user) => {
    const recent = await MessageLog.find({ fromUserId: user.id, channel: "email" })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return jsonOk({
      connected: Boolean(process.env.SMTP_USER || process.env.GMAIL_REFRESH_TOKEN),
      provider: process.env.GMAIL_REFRESH_TOKEN ? "gmail-oauth" : process.env.SMTP_USER ? "smtp" : "demo",
      recent,
    });
  });
}

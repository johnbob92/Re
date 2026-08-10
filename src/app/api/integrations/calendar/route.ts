import { jsonOk, withAuth } from "@/lib/api";
import { googleCalendarEmbedUrl } from "@/lib/google/calendar";
import { Interview } from "@/models";

export async function GET() {
  return withAuth(["admin", "recruiter", "candidate", "superadmin"], async (user) => {
    const filter: Record<string, unknown> = { status: "scheduled" };
    if (user.role === "admin") filter.adminId = user.id;
    if (user.role === "recruiter") {
      filter.recruiterId = user.id;
      if (user.recruiterType === "tech") filter.stage = "tech";
      else filter.stage = "hr";
    }
    if (user.role === "candidate") filter.candidateUserId = user.id;

    const events = await Interview.find(filter)
      .populate("candidateId", "name email")
      .sort({ scheduledAt: 1 })
      .lean();

    return jsonOk({
      embedUrl: googleCalendarEmbedUrl(user.email),
      connected: Boolean(process.env.GOOGLE_CALENDAR_REFRESH_TOKEN),
      events,
    });
  });
}

import { jsonOk, withAuth } from "@/lib/api";
import { CandidateProfile, Interview, NotificationTemplate, User } from "@/models";
import { sendEmail } from "@/lib/email/send";
import { DEFAULT_NOTIFICATION_TEMPLATES, renderTemplate } from "@/data/sample-messages";
import { addMinutes } from "date-fns";

/**
 * Processes due interview reminders:
 * - 15 minutes before: email recruiter + candidate
 * - 5 minutes before: mark join notification ready
 */
export async function POST() {
  return withAuth(["superadmin", "admin", "recruiter"], async () => {
    const now = new Date();
    const in15 = addMinutes(now, 15);
    const in5 = addMinutes(now, 5);

    const dueReminders = await Interview.find({
      status: "scheduled",
      reminderSentAt: null,
      scheduledAt: { $lte: in15, $gte: now },
    }).limit(100);

    let reminderCount = 0;
    for (const interview of dueReminders) {
      const candidate = await CandidateProfile.findById(interview.candidateId);
      const recruiter = await User.findById(interview.recruiterId);
      if (!candidate || !recruiter) continue;

      const tpl =
        (await NotificationTemplate.findOne({
          userId: interview.recruiterId,
          type: "reminder",
        })) || DEFAULT_NOTIFICATION_TEMPLATES.reminder;

      const vars = {
        candidateName: candidate.name,
        recruiterName: recruiter.username,
        scheduledAt: interview.scheduledAt.toLocaleString(),
        meetLink: interview.googleMeetLink || "https://meet.google.com/",
        companyName: "HireFlow",
        stage: interview.stage.toUpperCase(),
      };

      await sendEmail({
        fromUserId: String(interview.recruiterId),
        toEmail: candidate.email,
        toUserId: candidate.userId,
        type: "reminder",
        subject: renderTemplate(tpl.subject, vars),
        body: renderTemplate(tpl.body, vars),
      });

      await sendEmail({
        fromUserId: String(interview.recruiterId),
        toEmail: recruiter.email,
        toUserId: recruiter._id,
        type: "reminder",
        subject: `Interview in ~15 min with ${candidate.name}`,
        body: `Your ${interview.stage} interview starts at ${vars.scheduledAt}. Join: ${vars.meetLink}`,
      });

      interview.reminderSentAt = new Date();
      await interview.save();
      reminderCount += 1;
    }

    const joinReady = await Interview.updateMany(
      {
        status: "scheduled",
        joinNotifiedAt: null,
        scheduledAt: { $lte: in5, $gte: addMinutes(now, -5) },
      },
      { $set: { joinNotifiedAt: new Date() } }
    );

    return jsonOk({
      reminderCount,
      joinNotifications: joinReady.modifiedCount,
    });
  });
}

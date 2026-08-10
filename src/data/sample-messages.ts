import type { NotificationMessageType } from "@/types";

export const DEFAULT_NOTIFICATION_TEMPLATES: Record<
  NotificationMessageType,
  { subject: string; body: string }
> = {
  reminder: {
    subject: "Reminder: Your interview starts soon — {{candidateName}}",
    body: `Hi {{candidateName}},

This is a friendly reminder that your {{stage}} interview with {{recruiterName}} is scheduled for {{scheduledAt}}.

Please join using this Google Meet link 5 minutes before the start time:
{{meetLink}}

If you need to reschedule, reply to this email as soon as possible.

Best regards,
{{companyName}} Talent Team`,
  },
  waiting: {
    subject: "Thanks for interviewing — next steps for {{candidateName}}",
    body: `Hi {{candidateName}},

Thank you for taking the time to speak with {{recruiterName}} today.

We are currently reviewing your interview feedback and will share an update within 1–2 business days.

If you have any questions in the meantime, feel free to reply to this email.

Warm regards,
{{companyName}} Talent Team`,
  },
  passed: {
    subject: "Great news — you passed the {{stage}} interview!",
    body: `Hi {{candidateName}},

Congratulations! You have successfully passed the {{stage}} interview stage.

{{nextStepMessage}}

We're excited to continue the conversation with you.

Best,
{{companyName}} Talent Team`,
  },
  failed: {
    subject: "Update on your {{stage}} interview with {{companyName}}",
    body: `Hi {{candidateName}},

Thank you for interviewing with us for the {{stage}} stage.

After careful consideration, we will not be moving forward at this time. We truly appreciate the time and energy you invested in the process.

We wish you every success in your next opportunity.

Kind regards,
{{companyName}} Talent Team`,
  },
  tech_invite: {
    subject: "Next step: schedule your Technical Interview",
    body: `Hi {{candidateName}},

Congratulations on passing the HR interview!

Please schedule your Technical Interview with {{techRecruiterName}} using this Calendly link:
{{calendlyUrl}}

Looking forward to the next conversation.

Best,
{{companyName}} Talent Team`,
  },
  final_invite: {
    subject: "Final Interview invitation — schedule with the Hiring Manager",
    body: `Hi {{candidateName}},

Excellent work — you passed the Technical Interview!

Please schedule your Final Interview using this Calendly link:
{{calendlyUrl}}

See you soon,
{{companyName}} Talent Team`,
  },
  offer: {
    subject: "Offer Letter from {{companyName}}",
    body: `Hi {{candidateName}},

We are thrilled to extend an offer for you to join {{companyName}}!

Please review the offer letter details below (or in the attached document) and let us know if you have any questions.

{{offerContent}}

Welcome aboard — we can't wait to work with you!

Warmly,
{{companyName}} Hiring Team`,
  },
};

export function renderTemplate(
  template: string,
  vars: Record<string, string | undefined>
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

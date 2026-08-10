/**
 * Google Calendar + Meet integration helpers.
 * When OAuth credentials are missing, returns deterministic demo event payloads.
 */

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendeeEmails: string[];
}

export async function createGoogleCalendarEvent(input: CalendarEventInput) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CALENDAR_REFRESH_TOKEN) {
    const id = `demo-event-${Date.now()}`;
    return {
      demo: true as const,
      eventId: id,
      htmlLink: `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(input.summary)}`,
      hangoutLink: `https://meet.google.com/demo-${Math.random().toString(36).slice(2, 10)}`,
    };
  }

  // Real implementation uses googleapis OAuth2 + calendar.events.insert with conferenceData
  const { google } = await import("googleapis");
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN });

  const calendar = google.calendar({ version: "v3", auth: oauth2 });
  const res = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
      attendees: input.attendeeEmails.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `hireflow-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return {
    demo: false as const,
    eventId: res.data.id!,
    htmlLink: res.data.htmlLink!,
    hangoutLink: res.data.hangoutLink || res.data.conferenceData?.entryPoints?.[0]?.uri || "",
  };
}

export function googleCalendarEmbedUrl(email?: string) {
  const src = email || "primary";
  return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(src)}&ctz=America%2FNew_York&mode=WEEK`;
}

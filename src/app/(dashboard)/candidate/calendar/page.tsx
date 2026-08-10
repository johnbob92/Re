"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/utils/dates";

export default function CandidateCalendarPage() {
  const [embedUrl, setEmbedUrl] = useState("");
  const [events, setEvents] = useState<
    Array<{
      _id: string;
      stage: string;
      scheduledAt: string;
      googleMeetLink?: string;
      canJoin?: boolean;
    }>
  >([]);

  useEffect(() => {
    fetch("/api/integrations/calendar")
      .then((r) => r.json())
      .then((d) => {
        setEmbedUrl(d.embedUrl);
        setEvents(d.events || []);
      });
  }, []);

  return (
    <DashboardShell title="My Calendar" subtitle="Your scheduled interviews in Google Calendar">
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3 overflow-hidden p-0">
          <iframe title="Google Calendar" src={embedUrl} className="h-[640px] w-full border-0" />
        </Card>
        <Card className="xl:col-span-2">
          <Table headers={["Stage", "When", "Join"]}>
            {events.map((e) => (
              <tr key={e._id}>
                <Td className="uppercase">{e.stage}</Td>
                <Td>{formatDateTime(e.scheduledAt)}</Td>
                <Td>
                  {e.canJoin && e.googleMeetLink ? (
                    <a href={e.googleMeetLink} target="_blank" className="text-[var(--primary)] underline">
                      Join the Interview
                    </a>
                  ) : (
                    "Available at T-5"
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </DashboardShell>
  );
}

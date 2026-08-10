"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/utils/dates";

export default function RecruiterCalendarPage() {
  const [embedUrl, setEmbedUrl] = useState("");
  const [events, setEvents] = useState<
    Array<{
      _id: string;
      stage: string;
      scheduledAt: string;
      googleMeetLink?: string;
      candidateId?: { name?: string };
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
    <DashboardShell title="Calendar" subtitle="Your scheduled interviews via Google Calendar">
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3 overflow-hidden p-0">
          <iframe title="Google Calendar" src={embedUrl} className="h-[640px] w-full border-0" />
        </Card>
        <Card className="xl:col-span-2">
          <h3 className="mb-3 font-semibold">Upcoming</h3>
          <Table headers={["Candidate", "Stage", "When", "Meet"]}>
            {events.map((e) => (
              <tr key={e._id}>
                <Td>{e.candidateId?.name || "—"}</Td>
                <Td className="uppercase">{e.stage}</Td>
                <Td>{formatDateTime(e.scheduledAt)}</Td>
                <Td>
                  {e.googleMeetLink ? (
                    <a href={e.googleMeetLink} target="_blank" className="text-[var(--primary)] underline">
                      Join
                    </a>
                  ) : (
                    "—"
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

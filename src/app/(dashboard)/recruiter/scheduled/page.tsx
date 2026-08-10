"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { ageFromBirthday, formatDateTime } from "@/lib/utils/dates";

interface InterviewRow {
  _id: string;
  scheduledAt: string;
  googleMeetLink?: string;
  canJoin: boolean;
  minutesUntil: number;
  stage: string;
  candidateId?: {
    name?: string;
    birthday?: string;
    location?: string;
    experienceYears?: number;
    majorStack?: string;
    linkedinUrl?: string;
    resumeUrl?: string;
  };
}

export default function RecruiterScheduledPage() {
  const [items, setItems] = useState<InterviewRow[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/interviews");
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  async function send(interviewId: string, action: "reminder" | "waiting") {
    const res = await fetch("/api/interviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interviewId, action }),
    });
    const data = await res.json();
    setMessage(res.ok ? `${action} message sent` : data.error || "Failed");
    // also process auto reminders
    await fetch("/api/jobs/reminders", { method: "POST" });
    load();
  }

  return (
    <DashboardShell
      title="Scheduled Interviews"
      subtitle="HR recruiters see HR interviews; Tech recruiters see Tech interviews. Reminder auto-sends at T-15."
    >
      {message ? <p className="mb-3 text-sm text-[var(--primary)]">{message}</p> : null}
      <Table
        headers={[
          "Candidate",
          "Age",
          "Location",
          "Experience",
          "Major Stack",
          "LinkedIn",
          "Resume",
          "Scheduled",
          "Actions",
        ]}
      >
        {items.map((i) => (
          <tr key={i._id}>
            <Td className="font-medium">{i.candidateId?.name}</Td>
            <Td>{ageFromBirthday(i.candidateId?.birthday) ?? "—"}</Td>
            <Td>{i.candidateId?.location || "—"}</Td>
            <Td>{i.candidateId?.experienceYears ?? 0}y</Td>
            <Td>{i.candidateId?.majorStack || "—"}</Td>
            <Td>
              {i.candidateId?.linkedinUrl ? (
                <a href={i.candidateId.linkedinUrl} target="_blank" className="text-[var(--primary)] underline">
                  Open
                </a>
              ) : (
                "—"
              )}
            </Td>
            <Td>
              {i.candidateId?.resumeUrl ? (
                <a href={i.candidateId.resumeUrl} target="_blank" className="text-[var(--primary)] underline">
                  Resume
                </a>
              ) : (
                "—"
              )}
            </Td>
            <Td>
              <div className="text-sm">{formatDateTime(i.scheduledAt)}</div>
              <div className="text-xs text-[var(--muted)]">
                {i.minutesUntil > 0 ? `in ${i.minutesUntil} min` : "started / past"}
              </div>
            </Td>
            <Td>
              <div className="flex min-w-56 flex-wrap gap-1">
                <Button size="sm" variant="secondary" onClick={() => send(i._id, "reminder")}>
                  Reminder
                </Button>
                <Button size="sm" variant="secondary" onClick={() => send(i._id, "waiting")}>
                  Waiting
                </Button>
                {i.canJoin ? (
                  <a href={i.googleMeetLink || "#"} target="_blank">
                    <Button size="sm" variant="success">
                      Join the Interview
                    </Button>
                  </a>
                ) : (
                  <Button size="sm" variant="ghost" disabled>
                    Join at T-5
                  </Button>
                )}
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </DashboardShell>
  );
}

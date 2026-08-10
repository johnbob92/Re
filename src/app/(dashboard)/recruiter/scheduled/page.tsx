"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState, LoadingBlock } from "@/components/ui/Loading";
import { ageFromBirthday, formatDateTime } from "@/lib/utils/dates";
import { downloadCsv } from "@/lib/utils/csv";

interface InterviewRow {
  _id: string;
  scheduledAt: string;
  googleMeetLink?: string;
  canJoin: boolean;
  minutesUntil: number;
  stage: string;
  status: string;
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

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RecruiterScheduledPage() {
  const [items, setItems] = useState<InterviewRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [rescheduleTarget, setRescheduleTarget] = useState<InterviewRow | null>(null);
  const [newTime, setNewTime] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    const res = await fetch("/api/interviews?status=scheduled");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.candidateId?.name, i.candidateId?.location, i.candidateId?.majorStack, i.stage]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [items, query]);

  async function send(interviewId: string, action: "reminder" | "waiting") {
    setBusyId(interviewId);
    const res = await fetch("/api/interviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interviewId, action }),
    });
    const data = await res.json();
    setBusyId("");
    setMessage(res.ok ? `${action} message sent` : data.error || "Failed");
    await fetch("/api/jobs/reminders", { method: "POST" });
    load();
  }

  async function cancelInterview(interview: InterviewRow) {
    if (!confirm(`Cancel interview with ${interview.candidateId?.name || "candidate"}?`)) return;
    setBusyId(interview._id);
    const res = await fetch("/api/interviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interviewId: interview._id, action: "cancel" }),
    });
    const data = await res.json();
    setBusyId("");
    setMessage(res.ok ? "Interview cancelled" : data.error || "Cancel failed");
    load();
  }

  async function submitReschedule() {
    if (!rescheduleTarget || !newTime) return;
    setBusyId(rescheduleTarget._id);
    const res = await fetch("/api/interviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interviewId: rescheduleTarget._id,
        action: "reschedule",
        scheduledAt: new Date(newTime).toISOString(),
      }),
    });
    const data = await res.json();
    setBusyId("");
    setMessage(res.ok ? "Interview rescheduled" : data.error || "Reschedule failed");
    if (res.ok) {
      setRescheduleTarget(null);
      setNewTime("");
      load();
    }
  }

  function exportCsv() {
    downloadCsv(
      `hireflow-scheduled-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Candidate", "Location", "Experience", "Stack", "Stage", "Scheduled At", "Meet Link"],
      filtered.map((i) => [
        i.candidateId?.name || "",
        i.candidateId?.location || "",
        i.candidateId?.experienceYears ?? "",
        i.candidateId?.majorStack || "",
        i.stage,
        i.scheduledAt,
        i.googleMeetLink || "",
      ])
    );
  }

  return (
    <DashboardShell
      title="Scheduled Interviews"
      subtitle="Reminder auto-sends at T-15. Cancel or reschedule when plans change."
      actions={
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      }
    >
      {message ? <p className="mb-3 text-sm text-[var(--primary)]">{message}</p> : null}
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search scheduled interviews..."
      />

      {loading ? <LoadingBlock label="Loading interviews..." /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState title="No scheduled interviews found" />
      ) : null}

      {!loading && filtered.length > 0 ? (
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
          {filtered.map((i) => (
            <tr key={i._id}>
              <Td className="font-medium">{i.candidateId?.name}</Td>
              <Td>{ageFromBirthday(i.candidateId?.birthday) ?? "—"}</Td>
              <Td>{i.candidateId?.location || "—"}</Td>
              <Td>{i.candidateId?.experienceYears ?? 0}y</Td>
              <Td>{i.candidateId?.majorStack || "—"}</Td>
              <Td>
                {i.candidateId?.linkedinUrl ? (
                  <a
                    href={i.candidateId.linkedinUrl}
                    target="_blank"
                    className="text-[var(--primary)] underline"
                  >
                    Open
                  </a>
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                {i.candidateId?.resumeUrl ? (
                  <a
                    href={i.candidateId.resumeUrl}
                    target="_blank"
                    className="text-[var(--primary)] underline"
                  >
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
                <div className="flex min-w-64 flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === i._id}
                    onClick={() => send(i._id, "reminder")}
                  >
                    Reminder
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === i._id}
                    onClick={() => send(i._id, "waiting")}
                  >
                    Waiting
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === i._id}
                    onClick={() => {
                      setRescheduleTarget(i);
                      setNewTime(toLocalInputValue(i.scheduledAt));
                    }}
                  >
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === i._id}
                    onClick={() => cancelInterview(i)}
                  >
                    Cancel
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
      ) : null}

      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule interview"
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Move {rescheduleTarget?.candidateId?.name || "candidate"} to a new time. Availability and
            conflict checks still apply.
          </p>
          <Field label="New date & time">
            <Input
              type="datetime-local"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRescheduleTarget(null)}>
              Close
            </Button>
            <Button onClick={submitReschedule} disabled={!newTime || busyId === rescheduleTarget?._id}>
              Save new time
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}

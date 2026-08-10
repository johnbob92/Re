"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils/dates";

interface InterviewItem {
  _id: string;
  stage: string;
  status: string;
  scheduledAt: string;
  googleMeetLink?: string;
  canJoin?: boolean;
  minutesUntil?: number;
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CandidateSchedulePage() {
  const [embedUrl, setEmbedUrl] = useState("");
  const [schedulingUrl, setSchedulingUrl] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [email, setEmail] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [stage, setStage] = useState("hr");
  const [message, setMessage] = useState("");
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [rescheduleTarget, setRescheduleTarget] = useState<InterviewItem | null>(null);
  const [newTime, setNewTime] = useState("");
  const [busyId, setBusyId] = useState("");
  const [availability, setAvailability] = useState<{
    name?: string;
    timezone?: string;
    availableWeekdays?: number[];
    availableFrom?: string;
    availableTo?: string;
    recruiterType?: string;
  } | null>(null);

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  async function loadInterviews() {
    const res = await fetch("/api/interviews?status=scheduled");
    const data = await res.json();
    setInterviews(data.items || []);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/integrations/calendly"),
      fetch("/api/profile"),
      fetch("/api/interviews?status=scheduled"),
    ]).then(async ([cRes, pRes, iRes]) => {
      const c = await cRes.json();
      const p = await pRes.json();
      const i = await iRes.json();
      setEmbedUrl(c.embedUrl);
      setSchedulingUrl(c.schedulingUrl);
      setCandidateId(p.profile?._id || "");
      setEmail(p.user?.email || p.profile?.email || "");
      setAvailability(p.recruiterAvailability || null);
      setInterviews(i.items || []);
      if (p.profile?.status === "hr_pass") setStage("tech");
      if (p.profile?.status === "tech_pass") setStage("final");
    });
  }, []);

  async function book(e: FormEvent) {
    e.preventDefault();
    if (!candidateId || !scheduledAt) return;
    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId,
        stage,
        scheduledAt: new Date(scheduledAt).toISOString(),
      }),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? `Interview booked. Google Meet: ${data.item?.googleMeetLink || "created"}`
        : data.error || "Booking failed"
    );
    if (res.ok) {
      setScheduledAt("");
      loadInterviews();
    }
  }

  async function simulateCalendlyWebhook() {
    if (!email || !scheduledAt) {
      setMessage("Pick a date/time first to simulate Calendly webhook booking");
      return;
    }
    const eventName =
      stage === "final"
        ? "Final Interview"
        : stage === "tech"
          ? "Technical Interview"
          : "HR Interview";
    const res = await fetch("/api/integrations/calendly/webhook", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        startTime: new Date(scheduledAt).toISOString(),
        eventName,
      }),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? `Calendly webhook booked ${data.stage} interview. Meet: ${data.meetLink}`
        : data.error || "Webhook simulation failed"
    );
    if (res.ok) loadInterviews();
  }

  async function cancelInterview(item: InterviewItem) {
    if (!confirm("Cancel this interview?")) return;
    setBusyId(item._id);
    const res = await fetch("/api/interviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interviewId: item._id, action: "cancel" }),
    });
    const data = await res.json();
    setBusyId("");
    setMessage(res.ok ? "Interview cancelled" : data.error || "Cancel failed");
    if (res.ok) loadInterviews();
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
      loadInterviews();
    }
  }

  return (
    <DashboardShell
      title="Schedule Interview"
      subtitle="Book via Calendly or confirm a time. Cancel/reschedule upcoming interviews anytime."
    >
      {interviews.length ? (
        <Card className="mb-4">
          <h3 className="mb-3 font-semibold">Upcoming interviews</h3>
          <div className="space-y-3">
            {interviews.map((item) => (
              <div
                key={item._id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="capitalize">{item.stage}</Badge>
                    <span className="text-sm font-medium">{formatDateTime(item.scheduledAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {typeof item.minutesUntil === "number" && item.minutesUntil > 0
                      ? `Starts in ${item.minutesUntil} min`
                      : "Started / past"}
                    {item.googleMeetLink ? (
                      <>
                        {" · "}
                        <a
                          href={item.googleMeetLink}
                          target="_blank"
                          className="text-[var(--primary)] underline"
                        >
                          Meet link
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === item._id}
                    onClick={() => {
                      setRescheduleTarget(item);
                      setNewTime(toLocalInputValue(item.scheduledAt));
                    }}
                  >
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === item._id}
                    onClick={() => cancelInterview(item)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3 overflow-hidden p-0">
          {embedUrl ? (
            <iframe title="Calendly" src={embedUrl} className="h-[700px] w-full border-0" />
          ) : (
            <div className="p-6 text-sm text-[var(--muted)]">Loading Calendly...</div>
          )}
        </Card>
        <Card className="xl:col-span-2 space-y-4">
          <div>
            <h3 className="font-semibold">Confirm scheduled time</h3>
            <p className="text-sm text-[var(--muted)]">
              After picking a time in Calendly, save it here. Demo environments can also simulate the
              Calendly webhook.
            </p>
            <a
              href={schedulingUrl || "#"}
              target="_blank"
              className="mt-2 inline-block text-sm text-[var(--primary)] underline"
            >
              Open Calendly in new tab
            </a>
          </div>
          {availability ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
              <p className="font-medium">
                {availability.name || "Recruiter"} availability
                {availability.recruiterType ? ` (${availability.recruiterType})` : ""}
              </p>
              <p className="mt-1 text-[var(--muted)]">
                {(availability.availableWeekdays || [1, 2, 3, 4, 5])
                  .map((d) => weekdayLabels[d] || d)
                  .join(", ")}{" "}
                · {availability.availableFrom || "09:00"}–
                {availability.availableTo || "17:00"}{" "}
                ({availability.timezone || "America/New_York"})
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Booking outside this window or overlapping an existing interview is blocked.
              </p>
            </div>
          ) : null}
          <form onSubmit={book} className="space-y-3">
            <Field label="Stage">
              <Select value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="hr">HR Interview</option>
                <option value="tech">Technical Interview</option>
                <option value="final">Final Interview</option>
              </Select>
            </Field>
            <Field label="Scheduled date & time">
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" className="w-full">
              Confirm booking
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={simulateCalendlyWebhook}
            >
              Simulate Calendly webhook
            </Button>
          </form>
          {message ? <p className="text-sm text-[var(--primary)]">{message}</p> : null}
        </Card>
      </div>

      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule interview"
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Choose a new time within your recruiter&apos;s availability window.
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

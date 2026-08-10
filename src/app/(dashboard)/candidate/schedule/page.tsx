"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";

export default function CandidateSchedulePage() {
  const [embedUrl, setEmbedUrl] = useState("");
  const [schedulingUrl, setSchedulingUrl] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [email, setEmail] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [stage, setStage] = useState("hr");
  const [message, setMessage] = useState("");
  const [availability, setAvailability] = useState<{
    name?: string;
    timezone?: string;
    availableWeekdays?: number[];
    availableFrom?: string;
    availableTo?: string;
    recruiterType?: string;
  } | null>(null);

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    Promise.all([fetch("/api/integrations/calendly"), fetch("/api/profile")]).then(
      async ([cRes, pRes]) => {
        const c = await cRes.json();
        const p = await pRes.json();
        setEmbedUrl(c.embedUrl);
        setSchedulingUrl(c.schedulingUrl);
        setCandidateId(p.profile?._id || "");
        setEmail(p.user?.email || p.profile?.email || "");
        setAvailability(p.recruiterAvailability || null);
        if (p.profile?.status === "hr_pass") setStage("tech");
        if (p.profile?.status === "tech_pass") setStage("final");
      }
    );
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
        scheduledAt,
      }),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? `Interview booked. Google Meet: ${data.item?.googleMeetLink || "created"}`
        : data.error || "Booking failed"
    );
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
  }

  return (
    <DashboardShell
      title="Schedule Interview"
      subtitle="Book using your recruiter's Calendly link. Webhooks auto-create Meet links."
    >
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
              After picking a time in Calendly, save it here — or simulate the Calendly webhook that
              production uses when invitee.created fires.
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
    </DashboardShell>
  );
}

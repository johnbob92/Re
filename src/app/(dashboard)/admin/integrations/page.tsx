"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, Link2, Mail, MessageSquare, Cloud } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <Badge
      className={
        connected
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100"
      }
    >
      {connected ? "Connected" : "Demo mode"}
    </Badge>
  );
}

export default function AdminIntegrationsPage() {
  const [gmail, setGmail] = useState<{ connected?: boolean; provider?: string }>({});
  const [calendar, setCalendar] = useState<{ connected?: boolean }>({});
  const [calendly, setCalendly] = useState<{ schedulingUrl?: string; demo?: boolean }>({});
  const [slack, setSlack] = useState<{ connected?: boolean; channel?: string }>({});
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [slackText, setSlackText] = useState(
    "HireFlow test: integrations page is online ✅"
  );
  const [message, setMessage] = useState("");

  async function load() {
    const [g, c, cal, s, profile] = await Promise.all([
      fetch("/api/integrations/gmail").then((r) => r.json()),
      fetch("/api/integrations/calendar").then((r) => r.json()),
      fetch("/api/integrations/calendly").then((r) => r.json()),
      fetch("/api/integrations/slack").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ]);
    setGmail(g);
    setCalendar(c);
    setCalendly(cal);
    setSlack(s);
    setCalendlyUrl(profile.profile?.calendlyUrl || cal.schedulingUrl || "");
  }

  useEffect(() => {
    load();
  }, []);

  async function saveCalendly(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/integrations/calendly", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendlyUrl }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Calendly URL saved" : data.error || "Save failed");
    load();
  }

  async function testSlack() {
    const res = await fetch("/api/integrations/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: slackText }),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? data.demo
          ? "Slack demo message logged (set SLACK_BOT_TOKEN for live posts)"
          : "Slack message sent"
        : data.error || "Slack failed"
    );
  }

  return (
    <DashboardShell
      title="Integrations"
      subtitle="Connect Gmail, Google Calendar, Calendly, Slack, and AWS S3"
    >
      {message ? <p className="mb-4 text-sm text-[var(--primary)]">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Mail className="h-4 w-4 text-[var(--primary)]" />
              Gmail / Email
            </div>
            <StatusPill connected={Boolean(gmail.connected)} />
          </div>
          <p className="text-sm text-[var(--muted)]">
            Provider: <span className="font-medium">{gmail.provider || "demo"}</span>
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Configure <code>SMTP_*</code> or Gmail OAuth vars in <code>.env.local</code> to send real
            candidate emails.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <CalendarDays className="h-4 w-4 text-[var(--primary)]" />
              Google Calendar + Meet
            </div>
            <StatusPill connected={Boolean(calendar.connected)} />
          </div>
          <p className="text-sm text-[var(--muted)]">
            Interview bookings create Meet links automatically. Demo Meet links are used until Google
            OAuth is configured.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Link2 className="h-4 w-4 text-[var(--primary)]" />
              Calendly
            </div>
            <StatusPill connected={!calendly.demo && Boolean(calendlyUrl)} />
          </div>
          <form onSubmit={saveCalendly} className="space-y-3">
            <Field label="Final interview / hiring manager Calendly URL">
              <Input
                value={calendlyUrl}
                onChange={(e) => setCalendlyUrl(e.target.value)}
                placeholder="https://calendly.com/your-team/final"
              />
            </Field>
            <Button type="submit" size="sm">
              Save Calendly
            </Button>
          </form>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Webhook endpoint: <code>/api/integrations/calendly/webhook</code> (event{" "}
            <code>invitee.created</code>). Set <code>CALENDLY_WEBHOOK_SIGNING_KEY</code> for
            signature verification. Bookings auto-create Google Meet interviews.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <MessageSquare className="h-4 w-4 text-[var(--primary)]" />
              Slack
            </div>
            <StatusPill connected={Boolean(slack.connected)} />
          </div>
          <p className="mb-2 text-xs text-[var(--muted)]">
            Default channel: {slack.channel || "#hiring"}
          </p>
          <Field label="Test message">
            <Textarea value={slackText} onChange={(e) => setSlackText(e.target.value)} />
          </Field>
          <Button className="mt-3" size="sm" onClick={testSlack}>
            Send test to Slack
          </Button>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Cloud className="h-4 w-4 text-[var(--primary)]" />
            AWS S3 uploads
          </div>
          <p className="text-sm text-[var(--muted)]">
            Resumes, recordings, avatars, and offer files upload through presigned S3 URLs. Only the
            public URL is stored in MongoDB. Set <code>AWS_REGION</code>,{" "}
            <code>AWS_ACCESS_KEY_ID</code>, <code>AWS_SECRET_ACCESS_KEY</code>, and{" "}
            <code>AWS_S3_BUCKET</code>.
          </p>
        </Card>
      </div>
    </DashboardShell>
  );
}

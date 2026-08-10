"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { CandidateStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils/dates";
import type { CandidateStatus } from "@/types";

const STEPS: CandidateStatus[] = [
  "need_to_connect",
  "connected",
  "scheduled",
  "hr_pass",
  "tech_pass",
  "final_pass",
  "offer_sent",
  "hired",
];

export default function CandidateStatePage() {
  const [profile, setProfile] = useState<{
    name?: string;
    status?: CandidateStatus;
    hrScheduledAt?: string;
    techScheduledAt?: string;
    finalScheduledAt?: string;
  } | null>(null);
  const [interview, setInterview] = useState<{
    _id: string;
    scheduledAt: string;
    googleMeetLink?: string;
    canJoin?: boolean;
    stage?: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/profile"), fetch("/api/interviews")]).then(async ([pRes, iRes]) => {
      const p = await pRes.json();
      const i = await iRes.json();
      setProfile(p.profile);
      const next = (i.items || [])[0];
      setInterview(next || null);
    });
  }, []);

  const status = profile?.status || "need_to_connect";

  return (
    <DashboardShell
      title="My Interview Status"
      subtitle="Track your progress across HR, Technical, and Final interviews"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{profile?.name}</h2>
              <p className="text-sm text-[var(--muted)]">Current stage</p>
            </div>
            <CandidateStatusBadge
              status={status}
              scheduledAt={
                profile?.finalScheduledAt || profile?.techScheduledAt || profile?.hrScheduledAt
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {STEPS.map((step) => {
              const activeIndex = STEPS.indexOf(status as (typeof STEPS)[number]);
              const stepIndex = STEPS.indexOf(step);
              const done = activeIndex >= stepIndex || status.includes("pass") || status === "hired";
              return (
                <div
                  key={step}
                  className={`rounded-xl border p-3 text-xs ${
                    done
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
                      : "border-[var(--border)]"
                  }`}
                >
                  {step.replaceAll("_", " ")}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-2 font-semibold">Next interview</h3>
            {interview ? (
              <div className="space-y-2 text-sm">
                <p className="uppercase text-[var(--muted)]">{interview.stage}</p>
                <p>{formatDateTime(interview.scheduledAt)}</p>
                {interview.canJoin ? (
                  <a href={interview.googleMeetLink || "#"} target="_blank">
                    <Button className="w-full" variant="success">
                      Join the Interview
                    </Button>
                  </a>
                ) : (
                  <Button className="w-full" variant="secondary" disabled>
                    Join button appears 5 minutes before start
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">No upcoming interview yet.</p>
            )}
          </Card>

          {(status === "offer_sent" || status === "hired" || status === "final_pass") && (
            <Card>
              <h3 className="mb-2 font-semibold">Offer letter</h3>
              <p className="mb-3 text-sm text-[var(--muted)]">
                {status === "hired"
                  ? "You already accepted an offer. You can still review details."
                  : "Review and accept/decline your offer letter."}
              </p>
              <Link href="/candidate/offers">
                <Button className="w-full" variant="warning">
                  Open my offers
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

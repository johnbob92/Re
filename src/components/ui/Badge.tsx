"use client";

import { cn } from "@/lib/utils/cn";
import type { CandidateStatus, RecruiterStatus } from "@/types";

const candidateStyles: Record<CandidateStatus, string> = {
  need_to_connect: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  connected: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  declined: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  scheduled: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
  hr_pass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  hr_failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  tech_pass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  tech_failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  final_pass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  final_failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  offer_sent: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  hired: "bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-100",
};

const candidateLabels: Record<CandidateStatus, string> = {
  need_to_connect: "Need to Connect",
  connected: "Connected",
  declined: "Declined",
  scheduled: "Scheduled",
  hr_pass: "HR Pass",
  hr_failed: "HR Failed",
  tech_pass: "Tech Pass",
  tech_failed: "Tech Failed",
  final_pass: "Final Pass",
  final_failed: "Final Failed",
  offer_sent: "Offer Sent",
  hired: "Hired",
};

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        className
      )}
    >
      {children}
    </span>
  );
}

export function CandidateStatusBadge({
  status,
  scheduledAt,
}: {
  status: CandidateStatus;
  scheduledAt?: string | Date | null;
}) {
  const label =
    status === "scheduled" && scheduledAt
      ? `Scheduled (${new Date(scheduledAt).toLocaleString()})`
      : candidateLabels[status];

  return <Badge className={candidateStyles[status]}>{label}</Badge>;
}

export function RecruiterStatusBadge({ status }: { status: RecruiterStatus }) {
  const map: Record<RecruiterStatus, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    decline: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
    invited: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  };
  return <Badge className={map[status]}>{status}</Badge>;
}

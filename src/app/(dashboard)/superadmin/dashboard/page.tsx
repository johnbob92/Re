"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatCard } from "@/components/ui/Card";
import { PipelineCharts } from "@/components/charts/PipelineChart";
import { Table, Td } from "@/components/ui/Table";
import { CandidateStatusBadge } from "@/components/ui/Badge";
import type { CandidateStatus, DashboardStats } from "@/types";

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [candidates, setCandidates] = useState<
    Array<{
      _id: string;
      name: string;
      email: string;
      status: CandidateStatus;
      location?: string;
      experienceYears?: number;
      hrScheduledAt?: string;
      recruiterId?: { username?: string };
    }>
  >([]);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setCandidates(d.candidates || []);
      });
  }, []);

  return (
    <DashboardShell
      title="Super Admin Dashboard"
      subtitle="Cross-organization candidate pipeline with live graphs"
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total candidates" value={stats?.totalCandidates ?? "—"} />
        <StatCard label="Scheduled" value={stats?.scheduled ?? "—"} accent="#6366f1" />
        <StatCard label="HR Pass / Fail" value={`${stats?.hrPass ?? 0} / ${stats?.hrFailed ?? 0}`} accent="#10b981" />
        <StatCard label="Final Pass" value={stats?.finalPass ?? "—"} accent="#f59e0b" />
      </div>

      {stats ? <PipelineCharts stats={stats} /> : null}

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">All candidates</h2>
        <Table
          headers={["Name", "Email", "Location", "Exp", "Recruiter", "Status"]}
        >
          {candidates.map((c) => (
            <tr key={c._id}>
              <Td className="font-medium">{c.name}</Td>
              <Td>{c.email}</Td>
              <Td>{c.location || "—"}</Td>
              <Td>{c.experienceYears ?? "—"}y</Td>
              <Td>{c.recruiterId?.username || "—"}</Td>
              <Td>
                <CandidateStatusBadge status={c.status} scheduledAt={c.hrScheduledAt} />
              </Td>
            </tr>
          ))}
        </Table>
      </div>
    </DashboardShell>
  );
}

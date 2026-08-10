"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatCard } from "@/components/ui/Card";
import { PipelineCharts } from "@/components/charts/PipelineChart";
import { Table, Td } from "@/components/ui/Table";
import { CandidateStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState, LoadingBlock } from "@/components/ui/Loading";
import { downloadCsv } from "@/lib/utils/csv";
import type { CandidateStatus, DashboardStats } from "@/types";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.name, c.email, c.location, c.recruiterId?.username]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [candidates, query, statusFilter]);

  function exportCandidates() {
    downloadCsv(
      `hireflow-admin-candidates-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Email", "Location", "Experience Years", "Recruiter", "Status"],
      filtered.map((c) => [
        c.name,
        c.email,
        c.location || "",
        c.experienceYears ?? "",
        c.recruiterId?.username || "",
        c.status,
      ])
    );
  }

  function exportStats() {
    if (!stats) return;
    downloadCsv(
      `hireflow-admin-pipeline-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Status", "Count"],
      stats.byStatus.map((row) => [row.status, row.count])
    );
  }

  return (
    <DashboardShell
      title="Admin Dashboard"
      subtitle="Your company pipeline at a glance — graphs, trends, and recent candidates"
      actions={
        <>
          <Link href="/admin/analytics">
            <Button size="sm" variant="secondary">
              Team analytics
            </Button>
          </Link>
          <Button size="sm" variant="secondary" onClick={exportStats} disabled={!stats}>
            <Download className="h-4 w-4" />
            Export stats
          </Button>
          <Button size="sm" variant="secondary" onClick={exportCandidates} disabled={!filtered.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total candidates" value={stats?.totalCandidates ?? "—"} />
        <StatCard label="Scheduled" value={stats?.scheduled ?? "—"} accent="#6366f1" />
        <StatCard
          label="HR Pass / Fail"
          value={`${stats?.hrPass ?? 0} / ${stats?.hrFailed ?? 0}`}
          accent="#10b981"
        />
        <StatCard
          label="Hired"
          value={stats?.hired ?? "—"}
          accent="#f59e0b"
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tech Pass / Fail"
          value={`${stats?.techPass ?? 0} / ${stats?.techFailed ?? 0}`}
        />
        <StatCard
          label="Final Pass / Fail"
          value={`${stats?.finalPass ?? 0} / ${stats?.finalFailed ?? 0}`}
        />
        <StatCard label="Offer sent" value={stats?.byStatus?.find((s) => s.status === "offer_sent")?.count ?? 0} />
        <StatCard label="Connected" value={stats?.byStatus?.find((s) => s.status === "connected")?.count ?? 0} />
      </div>

      {loading ? <LoadingBlock label="Loading dashboard..." /> : null}
      {stats ? <PipelineCharts stats={stats} /> : null}

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Recent candidates</h2>
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          placeholder="Search candidates..."
          statusOptions={[
            { value: "", label: "All statuses" },
            { value: "scheduled", label: "Scheduled" },
            { value: "hr_pass", label: "HR Pass" },
            { value: "hr_failed", label: "HR Failed" },
            { value: "tech_pass", label: "Tech Pass" },
            { value: "tech_failed", label: "Tech Failed" },
            { value: "final_pass", label: "Final Pass" },
            { value: "offer_sent", label: "Offer Sent" },
            { value: "hired", label: "Hired" },
          ]}
        />
        {!loading && filtered.length === 0 ? (
          <EmptyState title="No candidates match your filters" />
        ) : null}
        {!loading && filtered.length > 0 ? (
          <Table headers={["Name", "Email", "Location", "Exp", "Recruiter", "Status"]}>
            {filtered.map((c) => (
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
        ) : null}
      </div>
    </DashboardShell>
  );
}

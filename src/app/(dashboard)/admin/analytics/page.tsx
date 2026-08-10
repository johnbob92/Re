"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, StatCard } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingBlock } from "@/components/ui/Loading";
import { downloadCsv } from "@/lib/utils/csv";

interface RecruiterAnalytics {
  recruiterId: string;
  name: string;
  email: string;
  recruiterType: "hr" | "tech";
  status: string;
  pass: number;
  fail: number;
  decided: number;
  passRate: number;
  byStage: Record<string, { pass: number; fail: number }>;
  activePipeline: number;
  hired: number;
  hiredTotal: number;
  hiredWeekly: number;
  hiredMonthly: number;
}

interface AnalyticsPayload {
  generatedAt: string;
  totals: {
    pass: number;
    fail: number;
    hired: number;
    activePipeline: number;
    decided: number;
    passRate: number;
    recruiters: number;
  };
  recruiters: RecruiterAnalytics[];
  chart: Array<{ name: string; passRate: number; pass: number; fail: number; hired: number }>;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function exportCsv() {
    if (!data) return;
    downloadCsv(
      `hireflow-team-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Name",
        "Type",
        "Status",
        "Pass",
        "Fail",
        "Pass Rate %",
        "Active Pipeline",
        "Hired",
        "Hired Weekly",
        "Hired Monthly",
        "Hired Total",
      ],
      data.recruiters.map((r) => [
        r.name,
        r.recruiterType,
        r.status,
        r.pass,
        r.fail,
        r.passRate,
        r.activePipeline,
        r.hired,
        r.hiredWeekly,
        r.hiredMonthly,
        r.hiredTotal,
      ])
    );
  }

  return (
    <DashboardShell
      title="Team Analytics"
      subtitle="Pass rates, stage outcomes, and hire counters by recruiter"
      actions={
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!data?.recruiters.length}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      }
    >
      {loading ? <LoadingBlock label="Loading analytics..." /> : null}
      {!loading && !data ? (
        <EmptyState title="Could not load analytics" description="Try refreshing the page." />
      ) : null}

      {data ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Team pass rate" value={`${data.totals.passRate}%`} accent="#10b981" />
            <StatCard label="Decided assessments" value={data.totals.decided} />
            <StatCard label="Active pipeline" value={data.totals.activePipeline} accent="#6366f1" />
            <StatCard label="Hired" value={data.totals.hired} accent="#f59e0b" />
          </div>

          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-sm font-semibold">Pass rate by recruiter</h3>
              <div className="h-72">
                {data.chart.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="passRate" name="Pass %" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-[var(--muted)]">No assessment decisions yet.</p>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold">Pass vs fail volume</h3>
              <div className="h-72">
                {data.chart.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="pass" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="fail" stackId="a" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-[var(--muted)]">No assessment decisions yet.</p>
                )}
              </div>
            </Card>
          </div>

          {!data.recruiters.length ? (
            <EmptyState
              title="No recruiters yet"
              description="Invite recruiters to start tracking team pass rates."
            />
          ) : (
            <Table
              headers={[
                "Recruiter",
                "Type",
                "Pass / Fail",
                "Pass rate",
                "By stage",
                "Pipeline",
                "Hired",
              ]}
            >
              {data.recruiters.map((r) => (
                <tr key={r.recruiterId}>
                  <Td>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-[var(--muted)]">{r.email}</div>
                  </Td>
                  <Td>
                    <Badge className="capitalize">{r.recruiterType}</Badge>
                  </Td>
                  <Td>
                    <span className="text-emerald-600">{r.pass}</span>
                    {" / "}
                    <span className="text-rose-600">{r.fail}</span>
                  </Td>
                  <Td>
                    <span className="font-semibold">{r.passRate}%</span>
                    <span className="ml-1 text-xs text-[var(--muted)]">({r.decided})</span>
                  </Td>
                  <Td>
                    <div className="text-xs text-[var(--muted)]">
                      HR {r.byStage.hr?.pass || 0}/{r.byStage.hr?.fail || 0} · Tech{" "}
                      {r.byStage.tech?.pass || 0}/{r.byStage.tech?.fail || 0} · Final{" "}
                      {r.byStage.final?.pass || 0}/{r.byStage.final?.fail || 0}
                    </div>
                  </Td>
                  <Td>{r.activePipeline}</Td>
                  <Td>
                    <div>{r.hired}</div>
                    <div className="text-[11px] text-[var(--muted)]">
                      W {r.hiredWeekly} · M {r.hiredMonthly} · Σ {r.hiredTotal}
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          )}

          <p className="mt-3 text-xs text-[var(--muted)]">
            Generated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </>
      ) : null}
    </DashboardShell>
  );
}

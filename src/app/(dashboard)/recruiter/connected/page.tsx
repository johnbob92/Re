"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Table, Td } from "@/components/ui/Table";
import { CandidateStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState, LoadingBlock } from "@/components/ui/Loading";
import { downloadCsv } from "@/lib/utils/csv";
import type { CandidateStatus } from "@/types";

interface CandidateRow {
  _id: string;
  name: string;
  email: string;
  location?: string;
  experienceYears?: number;
  majorStack?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  status: CandidateStatus;
}

export default function RecruiterConnectedPage() {
  const [items, setItems] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/connected");
    const data = await res.json();
    setItems(data.candidates || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.name, c.email, c.location, c.majorStack]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, query, statusFilter]);

  async function updateStatus(candidateId: string, status: "connected" | "declined") {
    await fetch("/api/connected", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId, status }),
    });
    load();
  }

  function exportCsv() {
    downloadCsv(
      `hireflow-connected-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Email", "Location", "Experience", "Major Stack", "Status"],
      filtered.map((c) => [
        c.name,
        c.email,
        c.location || "",
        c.experienceYears ?? "",
        c.majorStack || "",
        c.status,
      ])
    );
  }

  return (
    <DashboardShell
      title="Connected Candidates"
      subtitle="Candidates assigned to you for the current interview stage"
      actions={
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      }
    >
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        placeholder="Search connected candidates..."
        statusOptions={[
          { value: "", label: "All statuses" },
          { value: "connected", label: "Connected" },
          { value: "scheduled", label: "Scheduled" },
          { value: "hr_pass", label: "HR Pass" },
          { value: "hr_failed", label: "HR Failed" },
          { value: "tech_pass", label: "Tech Pass" },
          { value: "tech_failed", label: "Tech Failed" },
        ]}
      />

      {loading ? <LoadingBlock label="Loading connected candidates..." /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState title="No connected candidates found" />
      ) : null}

      {!loading && filtered.length > 0 ? (
        <Table
          headers={[
            "Name",
            "Email",
            "Location",
            "Experience",
            "Major Stack",
            "LinkedIn",
            "Resume",
            "Status",
            "Actions",
          ]}
        >
          {filtered.map((c) => (
            <tr key={c._id}>
              <Td className="font-medium">{c.name}</Td>
              <Td>{c.email}</Td>
              <Td>{c.location || "—"}</Td>
              <Td>{c.experienceYears ?? 0}y</Td>
              <Td>{c.majorStack || "—"}</Td>
              <Td>
                {c.linkedinUrl ? (
                  <a href={c.linkedinUrl} target="_blank" className="text-[var(--primary)] underline">
                    Open
                  </a>
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                {c.resumeUrl ? (
                  <a href={c.resumeUrl} target="_blank" className="text-[var(--primary)] underline">
                    Resume
                  </a>
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                <CandidateStatusBadge status={c.status} />
              </Td>
              <Td>
                <div className="flex gap-1">
                  <Button size="sm" variant="success" onClick={() => updateStatus(c._id, "connected")}>
                    Keep
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => updateStatus(c._id, "declined")}>
                    Decline
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      ) : null}
    </DashboardShell>
  );
}

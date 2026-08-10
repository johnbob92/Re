"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Table, Td } from "@/components/ui/Table";
import { CandidateStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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

  async function load() {
    const res = await fetch("/api/connected");
    const data = await res.json();
    setItems(data.candidates || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(candidateId: string, status: "connected" | "declined") {
    await fetch("/api/connected", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId, status }),
    });
    load();
  }

  return (
    <DashboardShell
      title="Connected Candidates"
      subtitle="Candidates assigned to you for the current interview stage"
    >
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
        {items.map((c) => (
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
    </DashboardShell>
  );
}

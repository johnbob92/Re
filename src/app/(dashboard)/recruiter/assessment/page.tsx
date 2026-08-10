"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FileUpload } from "@/components/ui/FileUpload";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState, LoadingBlock } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { ageFromBirthday } from "@/lib/utils/dates";
import { downloadCsv } from "@/lib/utils/csv";

interface AssessmentRow {
  _id: string;
  candidateId: {
    _id: string;
    name?: string;
    email?: string;
    birthday?: string;
    location?: string;
    experienceYears?: number;
    majorStack?: string;
    linkedinUrl?: string;
    resumeUrl?: string;
    whatsapp?: string;
  };
  recordingUrl?: string;
  englishLevel?: number;
  communication?: number;
  logistics?: number;
  adaptability?: number;
  confidence?: number;
  problemSolving?: number;
  availableUsEastern?: boolean;
  interestedInRole?: boolean;
  technicalSkills?: {
    cloudArchitecture?: number;
    backend?: number;
    frontend?: number;
  };
  comment?: string;
  decision?: string;
}

export default function RecruiterAssessmentPage() {
  const { user } = useAuth();
  const isTech = user?.recruiterType === "tech";
  const [items, setItems] = useState<AssessmentRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");

  async function load() {
    const res = await fetch("/api/assessments");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (decisionFilter && (item.decision || "pending") !== decisionFilter) return false;
      if (!q) return true;
      return [
        item.candidateId?.name,
        item.candidateId?.email,
        item.candidateId?.location,
        item.candidateId?.majorStack,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, query, decisionFilter]);

  function updateLocal(id: string, patch: Partial<AssessmentRow>) {
    setItems((prev) => prev.map((item) => (item._id === id ? { ...item, ...patch } : item)));
  }

  async function save(item: AssessmentRow, decision?: "pass" | "fail") {
    const res = await fetch("/api/assessments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: item.candidateId._id,
        recordingUrl: item.recordingUrl,
        englishLevel: item.englishLevel,
        communication: item.communication,
        logistics: item.logistics,
        adaptability: item.adaptability,
        confidence: item.confidence,
        problemSolving: item.problemSolving,
        availableUsEastern: item.availableUsEastern,
        interestedInRole: item.interestedInRole,
        technicalSkills: item.technicalSkills,
        comment: item.comment,
        decision: decision || item.decision || "pending",
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Assessment saved" : data.error || "Failed");
    load();
  }

  const headers = isTech
    ? [
        "Name",
        "Age",
        "Exp",
        "Location",
        "Email",
        "WhatsApp",
        "Stack",
        "LinkedIn",
        "Resume",
        "Recording URL",
        "Communication",
        "Cloud",
        "Backend",
        "Frontend",
        "Decision",
      ]
    : [
        "Name",
        "Exp",
        "Age",
        "Location",
        "Email",
        "WhatsApp",
        "Stack",
        "LinkedIn",
        "Resume",
        "Recording URL",
        "English",
        "Comm",
        "Logistics",
        "Adapt",
        "Confidence",
        "Problem",
        "US Eastern",
        "Interested",
        "Comment",
        "Decision",
      ];

  function exportCsv() {
    downloadCsv(
      `hireflow-assessments-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Name",
        "Email",
        "Location",
        "Experience",
        "Stack",
        "Decision",
        "Communication",
        "Comment",
      ],
      filtered.map((item) => [
        item.candidateId?.name || "",
        item.candidateId?.email || "",
        item.candidateId?.location || "",
        item.candidateId?.experienceYears ?? "",
        item.candidateId?.majorStack || "",
        item.decision || "pending",
        item.communication ?? "",
        item.comment || "",
      ])
    );
  }

  return (
    <DashboardShell
      title="Interview Assessment"
      subtitle={
        isTech
          ? "Technical assessment with cloud / backend / frontend scoring"
          : "HR assessment with communication and logistics scoring"
      }
      actions={
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      }
    >
      {message ? <p className="mb-3 text-sm text-[var(--primary)]">{message}</p> : null}
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        status={decisionFilter}
        onStatusChange={setDecisionFilter}
        placeholder="Search assessments..."
        statusOptions={[
          { value: "", label: "All decisions" },
          { value: "pending", label: "Pending" },
          { value: "pass", label: "Pass" },
          { value: "fail", label: "Fail" },
        ]}
      />
      {loading ? <LoadingBlock label="Loading assessments..." /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState title="No assessments found" />
      ) : null}
      {!loading && filtered.length > 0 ? (
      <Table headers={headers}>
        {filtered.map((item) => (
          <tr key={item._id}>
            <Td className="font-medium">{item.candidateId?.name}</Td>
            {!isTech ? <Td>{item.candidateId?.experienceYears ?? 0}y</Td> : null}
            <Td>{ageFromBirthday(item.candidateId?.birthday) ?? "—"}</Td>
            {isTech ? <Td>{item.candidateId?.experienceYears ?? 0}y</Td> : null}
            <Td>{item.candidateId?.location || "—"}</Td>
            <Td>{item.candidateId?.email}</Td>
            <Td>{item.candidateId?.whatsapp || "—"}</Td>
            <Td>{item.candidateId?.majorStack || "—"}</Td>
            <Td>
              {item.candidateId?.linkedinUrl ? (
                <a href={item.candidateId.linkedinUrl} target="_blank" className="text-[var(--primary)] underline">
                  Open
                </a>
              ) : (
                "—"
              )}
            </Td>
            <Td>
              {item.candidateId?.resumeUrl ? (
                <a href={item.candidateId.resumeUrl} target="_blank" className="text-[var(--primary)] underline">
                  Resume
                </a>
              ) : (
                "—"
              )}
            </Td>
            <Td>
              <div className="min-w-56">
                <FileUpload
                  folder="recordings"
                  accept="video/*,.mp4,.webm,.mov"
                  label="Upload recording"
                  value={item.recordingUrl || ""}
                  onChange={(recordingUrl) => updateLocal(item._id, { recordingUrl })}
                />
              </div>
            </Td>

            {isTech ? (
              <>
                <Td>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    className="w-16"
                    value={item.communication ?? 0}
                    onChange={(e) =>
                      updateLocal(item._id, { communication: Number(e.target.value) })
                    }
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    className="w-16"
                    value={item.technicalSkills?.cloudArchitecture ?? 0}
                    onChange={(e) =>
                      updateLocal(item._id, {
                        technicalSkills: {
                          ...item.technicalSkills,
                          cloudArchitecture: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    className="w-16"
                    value={item.technicalSkills?.backend ?? 0}
                    onChange={(e) =>
                      updateLocal(item._id, {
                        technicalSkills: {
                          ...item.technicalSkills,
                          backend: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    className="w-16"
                    value={item.technicalSkills?.frontend ?? 0}
                    onChange={(e) =>
                      updateLocal(item._id, {
                        technicalSkills: {
                          ...item.technicalSkills,
                          frontend: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Td>
              </>
            ) : (
              <>
                {(
                  [
                    "englishLevel",
                    "communication",
                    "logistics",
                    "adaptability",
                    "confidence",
                    "problemSolving",
                  ] as const
                ).map((key) => (
                  <Td key={key}>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      className="w-16"
                      value={item[key] ?? 0}
                      onChange={(e) =>
                        updateLocal(item._id, {
                          [key]: Number(e.target.value),
                        })
                      }
                    />
                  </Td>
                ))}
                <Td>
                  <input
                    type="checkbox"
                    checked={Boolean(item.availableUsEastern)}
                    onChange={(e) =>
                      updateLocal(item._id, { availableUsEastern: e.target.checked })
                    }
                  />
                </Td>
                <Td>
                  <input
                    type="checkbox"
                    checked={Boolean(item.interestedInRole)}
                    onChange={(e) =>
                      updateLocal(item._id, { interestedInRole: e.target.checked })
                    }
                  />
                </Td>
                <Td>
                  <Input
                    className="min-w-40"
                    value={item.comment || ""}
                    onChange={(e) => updateLocal(item._id, { comment: e.target.value })}
                  />
                </Td>
              </>
            )}

            <Td>
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => save(item)}>
                  Save
                </Button>
                <Button size="sm" variant="success" onClick={() => save(item, "pass")}>
                  Pass
                </Button>
                <Button size="sm" variant="danger" onClick={() => save(item, "fail")}>
                  Fail
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

"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { ageFromBirthday } from "@/lib/utils/dates";

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

  async function load() {
    // Ensure assessments exist for connected/scheduled candidates by reading assessments endpoint
    const res = await fetch("/api/assessments");
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

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

  return (
    <DashboardShell
      title="Interview Assessment"
      subtitle={
        isTech
          ? "Technical assessment with cloud / backend / frontend scoring"
          : "HR assessment with communication and logistics scoring"
      }
    >
      {message ? <p className="mb-3 text-sm text-[var(--primary)]">{message}</p> : null}
      <Table headers={headers}>
        {items.map((item) => (
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
              <Input
                className="min-w-40"
                value={item.recordingUrl || ""}
                onChange={(e) => updateLocal(item._id, { recordingUrl: e.target.value })}
                placeholder="S3 / Drive URL"
              />
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
    </DashboardShell>
  );
}

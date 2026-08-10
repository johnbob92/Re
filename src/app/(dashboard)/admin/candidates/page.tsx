"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { CandidateStatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { ageFromBirthday, formatDateTime } from "@/lib/utils/dates";
import type { CandidateStatus } from "@/types";

interface CandidateRow {
  _id: string;
  name: string;
  birthday?: string;
  location?: string;
  experienceYears?: number;
  email: string;
  whatsapp?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  recordingUrl?: string;
  status: CandidateStatus;
  hrScheduledAt?: string;
  techScheduledAt?: string;
  finalScheduledAt?: string;
  lastAssessmentComment?: string;
  recruiterId?: { _id: string; username?: string; email?: string; phone?: string; avatarUrl?: string };
}

interface RecruiterOption {
  _id: string;
  userId: string | { _id: string };
  name: string;
  recruiterType: "hr" | "tech";
  email: string;
  phone?: string;
  location?: string;
}

export default function AdminCandidatesPage() {
  const [items, setItems] = useState<CandidateRow[]>([]);
  const [recruiters, setRecruiters] = useState<RecruiterOption[]>([]);
  const [selected, setSelected] = useState<CandidateRow | null>(null);
  const [recruiterInfo, setRecruiterInfo] = useState<CandidateRow["recruiterId"] | null>(null);
  const [techRecruiterId, setTechRecruiterId] = useState("");
  const [warning, setWarning] = useState("");
  const [offerHtml, setOfferHtml] = useState(
    "<h2>Offer Letter</h2><p>We are delighted to offer you a position on our team.</p>"
  );
  const [message, setMessage] = useState("");

  async function load() {
    const [cRes, rRes] = await Promise.all([
      fetch("/api/candidates?pageSize=100"),
      fetch("/api/recruiters"),
    ]);
    const cData = await cRes.json();
    const rData = await rRes.json();
    setItems(cData.items || []);
    setRecruiters(rData.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  const techRecruiters = useMemo(
    () => recruiters.filter((r) => r.recruiterType === "tech"),
    [recruiters]
  );

  function recruiterUserId(r: RecruiterOption) {
    return typeof r.userId === "string" ? r.userId : r.userId?._id;
  }

  async function runAction(
    candidate: CandidateRow,
    action: string,
    extra: Record<string, unknown> = {}
  ) {
    setMessage("");
    setWarning("");
    const res = await fetch("/api/candidates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: candidate._id,
        action,
        techRecruiterId: techRecruiterId || undefined,
        offerHtml,
        ...extra,
      }),
    });
    const data = await res.json();
    if (res.status === 409 && data.details?.warning) {
      setSelected(candidate);
      setWarning(data.details.comment || data.error);
      return;
    }
    if (!res.ok) {
      setMessage(data.error || "Action failed");
      return;
    }
    setMessage("Action completed and candidate notified by email (or demo log).");
    setSelected(null);
    load();
  }

  function scheduledFor(c: CandidateRow) {
    return c.finalScheduledAt || c.techScheduledAt || c.hrScheduledAt;
  }

  return (
    <DashboardShell
      title="Candidates"
      subtitle="Full pipeline control with pass/fail overrides, Calendly invites, and offer letters"
    >
      {message ? <p className="mb-3 text-sm text-emerald-600">{message}</p> : null}

      <Table
        headers={[
          "Candidate",
          "Age",
          "Location",
          "Exp",
          "Email",
          "WhatsApp",
          "LinkedIn",
          "Resume",
          "Recording",
          "Recruiter",
          "Status",
          "Admin Actions",
        ]}
      >
        {items.map((c) => (
          <tr key={c._id}>
            <Td className="font-medium">{c.name}</Td>
            <Td>{ageFromBirthday(c.birthday) ?? "—"}</Td>
            <Td>{c.location || "—"}</Td>
            <Td>{c.experienceYears ?? 0}y</Td>
            <Td>{c.email}</Td>
            <Td>{c.whatsapp || "—"}</Td>
            <Td>
              {c.linkedinUrl ? (
                <a className="text-[var(--primary)] underline" href={c.linkedinUrl} target="_blank">
                  Profile
                </a>
              ) : (
                "—"
              )}
            </Td>
            <Td>
              {c.resumeUrl ? (
                <a className="text-[var(--primary)] underline" href={c.resumeUrl} target="_blank">
                  Resume
                </a>
              ) : (
                "—"
              )}
            </Td>
            <Td>
              {c.recordingUrl ? (
                <a className="text-[var(--primary)] underline" href={c.recordingUrl} target="_blank">
                  Recording
                </a>
              ) : (
                "—"
              )}
            </Td>
            <Td>
              {c.recruiterId ? (
                <Button size="sm" variant="secondary" onClick={() => setRecruiterInfo(c.recruiterId)}>
                  {c.recruiterId.username}
                </Button>
              ) : (
                "—"
              )}
            </Td>
            <Td>
              <CandidateStatusBadge status={c.status} scheduledAt={scheduledFor(c)} />
            </Td>
            <Td>
              <div className="flex min-w-52 flex-wrap gap-1">
                {(c.status === "scheduled" ||
                  c.status === "hr_failed" ||
                  c.status === "connected") && (
                  <Button size="sm" variant="success" onClick={() => setSelected(c)}>
                    HR Pass
                  </Button>
                )}
                {(c.status === "hr_pass" || c.status === "tech_failed") && (
                  <Button size="sm" variant="success" onClick={() => setSelected(c)}>
                    Tech Pass
                  </Button>
                )}
                {(c.status === "tech_pass" || c.status === "final_failed") && (
                  <Button size="sm" variant="success" onClick={() => setSelected(c)}>
                    Final Pass
                  </Button>
                )}
                {c.status === "final_pass" || c.status === "offer_sent" ? (
                  <Button size="sm" variant="warning" onClick={() => setSelected(c)}>
                    Send Offer
                  </Button>
                ) : null}
                <Button size="sm" variant="danger" onClick={() => runAction(c, "fail_hr")}>
                  Fail
                </Button>
              </div>
            </Td>
          </tr>
        ))}
      </Table>

      <Modal
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setWarning("");
        }}
        title={selected ? `Admin decision — ${selected.name}` : "Admin decision"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            {selected &&
            (selected.status === "scheduled" ||
              selected.status === "hr_failed" ||
              selected.status === "connected") ? (
              <Button
                variant="success"
                onClick={() =>
                  runAction(selected, "pass_hr", {
                    acknowledgeRecruiterFail: Boolean(warning),
                  })
                }
              >
                Confirm HR Pass & send Tech Calendly
              </Button>
            ) : null}
            {selected &&
            (selected.status === "hr_pass" || selected.status === "tech_failed") ? (
              <Button
                variant="success"
                onClick={() =>
                  runAction(selected, "pass_tech", {
                    acknowledgeRecruiterFail: Boolean(warning),
                  })
                }
              >
                Confirm Tech Pass & send Final Calendly
              </Button>
            ) : null}
            {selected &&
            (selected.status === "tech_pass" ||
              selected.status === "final_failed" ||
              selected.status === "final_pass" ||
              selected.status === "offer_sent") ? (
              <Button
                variant="warning"
                onClick={() =>
                  runAction(
                    selected,
                    selected.status === "offer_sent" || selected.status === "final_pass"
                      ? "send_offer"
                      : "pass_final"
                  )
                }
              >
                Send Offer Letter
              </Button>
            ) : null}
          </>
        }
      >
        {warning ? (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">Recruiter fail override warning</p>
            <p className="mt-1">{warning}</p>
            <p className="mt-2 text-xs">
              You can still pass this candidate. Consider contacting the recruiter first.
            </p>
            {selected?.recruiterId?.email ? (
              <a
                className="mt-2 inline-block text-[var(--primary)] underline"
                href={`mailto:${selected.recruiterId.email}`}
              >
                Contact recruiter
              </a>
            ) : null}
          </div>
        ) : null}

        {(selected?.status === "scheduled" ||
          selected?.status === "hr_failed" ||
          selected?.status === "connected") && (
          <Field label="Select technical recruiter">
            <Select
              value={techRecruiterId}
              onChange={(e) => setTechRecruiterId(e.target.value)}
            >
              <option value="">Choose tech recruiter...</option>
              {techRecruiters.map((r) => (
                <option key={r._id} value={recruiterUserId(r)}>
                  {r.name} ({r.email})
                </option>
              ))}
            </Select>
          </Field>
        )}

        {(selected?.status === "tech_pass" ||
          selected?.status === "final_pass" ||
          selected?.status === "offer_sent" ||
          selected?.status === "final_failed") && (
          <Field label="Offer letter HTML">
            <Textarea value={offerHtml} onChange={(e) => setOfferHtml(e.target.value)} />
          </Field>
        )}

        {selected?.hrScheduledAt ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            HR scheduled: {formatDateTime(selected.hrScheduledAt)}
          </p>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(recruiterInfo)}
        onClose={() => setRecruiterInfo(null)}
        title="Recruiter information"
      >
        {recruiterInfo ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={recruiterInfo.avatarUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=r"}
                alt=""
                className="h-12 w-12 rounded-full"
              />
              <div>
                <p className="font-semibold">{recruiterInfo.username}</p>
                <p className="text-[var(--muted)]">{recruiterInfo.email}</p>
              </div>
            </div>
            <p>Phone: {recruiterInfo.phone || "—"}</p>
          </div>
        ) : null}
      </Modal>
    </DashboardShell>
  );
}

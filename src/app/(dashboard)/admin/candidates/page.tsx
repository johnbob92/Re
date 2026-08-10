"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { CandidateStatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { FileUpload } from "@/components/ui/FileUpload";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState, LoadingBlock } from "@/components/ui/Loading";
import { ageFromBirthday, formatDateTime } from "@/lib/utils/dates";
import { downloadCsv } from "@/lib/utils/csv";
import type { CandidateStatus } from "@/types";
import { Download, Upload } from "lucide-react";

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
  const [offerFileUrl, setOfferFileUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importCsv, setImportCsv] = useState("");
  const [importBusy, setImportBusy] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: "100" });
    if (statusFilter) params.set("status", statusFilter);
    const [cRes, rRes] = await Promise.all([
      fetch(`/api/candidates?${params.toString()}`),
      fetch("/api/recruiters"),
    ]);
    const cData = await cRes.json();
    const rData = await rRes.json();
    setItems(cData.items || []);
    setRecruiters(rData.items || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const techRecruiters = useMemo(
    () => recruiters.filter((r) => r.recruiterType === "tech"),
    [recruiters]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) =>
      [c.name, c.email, c.location, c.whatsapp, c.recruiterId?.username]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [items, query]);

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
        offerHtml: offerFileUrl
          ? `${offerHtml}<p><a href="${offerFileUrl}">Download offer letter</a></p>`
          : offerHtml,
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

  function exportCsv() {
    downloadCsv(
      `hireflow-admin-candidates-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Name",
        "Email",
        "Location",
        "Experience",
        "WhatsApp",
        "LinkedIn",
        "Resume",
        "Recruiter",
        "Status",
      ],
      filtered.map((c) => [
        c.name,
        c.email,
        c.location || "",
        c.experienceYears ?? "",
        c.whatsapp || "",
        c.linkedinUrl || "",
        c.resumeUrl || "",
        c.recruiterId?.username || "",
        c.status,
      ])
    );
  }

  async function openImport() {
    const res = await fetch("/api/candidates/import");
    const data = await res.json();
    setImportCsv(data.template || "");
    setImportOpen(true);
  }

  async function runImport() {
    setImportBusy(true);
    const res = await fetch("/api/candidates/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: importCsv }),
    });
    const data = await res.json();
    setImportBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Import failed");
      return;
    }
    setMessage(
      `Imported ${data.createdCount} candidates, skipped ${data.skippedCount}. Default password: ${data.defaultPassword}`
    );
    setImportOpen(false);
    load();
  }

  return (
    <DashboardShell
      title="Candidates"
      subtitle="Full pipeline control with pass/fail overrides, Calendly invites, and offer letters"
      actions={
        <>
          <Button size="sm" variant="secondary" onClick={openImport}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </>
      }
    >
      {message ? <p className="mb-3 text-sm text-emerald-600">{message}</p> : null}

      <SearchBar
        query={query}
        onQueryChange={setQuery}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        placeholder="Search name, email, location, recruiter..."
        statusOptions={[
          { value: "", label: "All statuses" },
          { value: "need_to_connect", label: "Need to Connect" },
          { value: "connected", label: "Connected" },
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

      {loading ? <LoadingBlock label="Loading candidates..." /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState title="No candidates found" description="Try another search or status filter." />
      ) : null}

      {!loading && filtered.length > 0 ? (
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
        {filtered.map((c) => (
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
                {c.status === "offer_sent" || c.status === "final_pass" ? (
                  <Button size="sm" variant="success" onClick={() => runAction(c, "mark_hired")}>
                    Mark Hired
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
      ) : null}

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
          <div className="space-y-3">
            <Field label="Offer letter HTML">
              <Textarea value={offerHtml} onChange={(e) => setOfferHtml(e.target.value)} />
            </Field>
            <Field label="Offer letter file (AWS S3)">
              <FileUpload
                folder="offers"
                accept=".pdf,.doc,.docx,application/pdf"
                label="Upload offer PDF"
                value={offerFileUrl}
                onChange={setOfferFileUrl}
              />
            </Field>
          </div>
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

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import candidates from CSV"
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={runImport} disabled={importBusy || !importCsv.trim()}>
              {importBusy ? "Importing..." : "Import candidates"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Required columns: <code>name</code>, <code>email</code>. Optional: whatsapp, location,
            linkedin, resume, techstack, majorstack, experience.
          </p>
          <Field label="CSV content">
            <Textarea
              className="min-h-56 font-mono text-xs"
              value={importCsv}
              onChange={(e) => setImportCsv(e.target.value)}
            />
          </Field>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--primary)]">
            <Upload className="h-4 w-4" />
            Upload .csv file
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportCsv(await file.text());
              }}
            />
          </label>
        </div>
      </Modal>
    </DashboardShell>
  );
}

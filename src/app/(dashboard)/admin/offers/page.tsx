"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { FileUpload } from "@/components/ui/FileUpload";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Table, Td } from "@/components/ui/Table";
import { LoadingBlock, EmptyState } from "@/components/ui/Loading";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils/dates";

interface OfferItem {
  _id: string;
  title: string;
  contentHtml: string;
  fileUrl?: string;
  status: "draft" | "sent" | "accepted" | "declined";
  sentAt?: string;
  candidateId?: { _id: string; name?: string; email?: string; status?: string };
}

interface CandidateOption {
  _id: string;
  name: string;
  email: string;
  status: string;
}

const statusTone: Record<OfferItem["status"], string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  sent: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100",
  declined: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
};

export default function AdminOffersPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OfferItem[]>([]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [companyName, setCompanyName] = useState("HireFlow Partner");
  const [templateHtml, setTemplateHtml] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    candidateId: "",
    title: "Job Offer Letter",
    contentHtml: "",
    fileUrl: "",
  });

  async function load() {
    setLoading(true);
    const [offersRes, candRes] = await Promise.all([
      fetch("/api/offer-letters"),
      fetch("/api/candidates?pageSize=100"),
    ]);
    const offers = await offersRes.json();
    const cands = await candRes.json();
    setItems(offers.items || []);
    setTemplateHtml(offers.templateHtml || "");
    setCompanyName(offers.companyName || "HireFlow Partner");
    setCandidates(cands.items || []);
    setForm((prev) => ({
      ...prev,
      contentHtml: prev.contentHtml || offers.templateHtml || "",
    }));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const eligible = useMemo(
    () =>
      candidates.filter((c) =>
        ["tech_pass", "final_pass", "offer_sent", "final_failed"].includes(c.status)
      ),
    [candidates]
  );

  async function saveTemplate() {
    const res = await fetch("/api/offer-letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateHtml,
        templateOnly: true,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Company offer template saved" : data.error || "Save failed");
  }

  async function createOffer(e: FormEvent, sendNow = false) {
    e.preventDefault();
    const res = await fetch("/api/offer-letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sendNow }),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? sendNow
          ? "Offer letter sent to candidate email"
          : "Offer draft saved"
        : data.error || "Failed"
    );
    if (res.ok) {
      setForm((prev) => ({ ...prev, title: "Job Offer Letter", fileUrl: "" }));
      load();
    }
  }

  async function setStatus(id: string, status: OfferItem["status"]) {
    const res = await fetch("/api/offer-letters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    setMessage(res.ok ? `Offer marked ${status}` : data.error || "Update failed");
    if (res.ok) load();
  }

  return (
    <DashboardShell
      title="Offer Letters"
      subtitle={`Create, edit, and send offer letters for ${companyName}`}
    >
      {message ? <p className="mb-4 text-sm text-[var(--primary)]">{message}</p> : null}

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Company offer template</h3>
          <RichTextEditor
            label="Template HTML"
            value={templateHtml}
            onChange={setTemplateHtml}
            previewVars={{ candidateName: "Alex Candidate", companyName }}
          />
          <p className="mt-2 text-xs text-[var(--muted)]">
            Variables: {"{{candidateName}}"}, {"{{companyName}}"}
          </p>
          <Button className="mt-3" size="sm" onClick={saveTemplate}>
            Save template
          </Button>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Create / send offer</h3>
          <form className="space-y-3" onSubmit={(e) => createOffer(e, false)}>
            <Field label="Candidate">
              <Select
                value={form.candidateId}
                onChange={(e) => setForm({ ...form, candidateId: e.target.value })}
                required
              >
                <option value="">Select candidate...</option>
                {eligible.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Field>
            <RichTextEditor
              label="Offer content (HTML)"
              value={form.contentHtml}
              onChange={(contentHtml) => setForm({ ...form, contentHtml })}
              previewVars={{
                candidateName:
                  eligible.find((c) => c._id === form.candidateId)?.name || "Candidate",
                companyName,
              }}
            />
            <Field label="Offer PDF (S3)">
              <FileUpload
                folder="offers"
                accept=".pdf,application/pdf"
                label="Upload offer PDF"
                value={form.fileUrl}
                onChange={(fileUrl) => setForm({ ...form, fileUrl })}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">
                Save draft
              </Button>
              <Button type="button" onClick={(e) => createOffer(e as unknown as FormEvent, true)}>
                Save & send email
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {loading ? (
        <LoadingBlock label="Loading offer letters..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No offer letters yet"
          description="Create a draft or send an offer to a final-pass candidate."
        />
      ) : (
        <Table headers={["Candidate", "Title", "Status", "Sent", "File", "Actions"]}>
          {items.map((item) => (
            <tr key={item._id}>
              <Td>
                <div className="font-medium">{item.candidateId?.name || "—"}</div>
                <div className="text-xs text-[var(--muted)]">{item.candidateId?.email}</div>
              </Td>
              <Td>{item.title}</Td>
              <Td>
                <Badge className={statusTone[item.status]}>{item.status}</Badge>
              </Td>
              <Td>{formatDateTime(item.sentAt)}</Td>
              <Td>
                {item.fileUrl ? (
                  <a href={item.fileUrl} target="_blank" className="text-[var(--primary)] underline">
                    PDF
                  </a>
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="success" onClick={() => setStatus(item._id, "accepted")}>
                    Accepted
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setStatus(item._id, "declined")}>
                    Declined
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </DashboardShell>
  );
}

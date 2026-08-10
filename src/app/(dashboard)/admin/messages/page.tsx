"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Table, Td } from "@/components/ui/Table";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState, LoadingBlock } from "@/components/ui/Loading";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils/dates";

interface MessageItem {
  _id: string;
  toEmail: string;
  type: string;
  subject: string;
  body: string;
  channel: string;
  status: "queued" | "sent" | "failed";
  error?: string;
  createdAt: string;
  fromUserId?: { username?: string; email?: string; role?: string };
}

const statusTone: Record<MessageItem["status"], string> = {
  queued: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
};

export default function AdminMessagesPage() {
  const [items, setItems] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<MessageItem | null>(null);

  useEffect(() => {
    const id = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ pageSize: "50" });
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      const res = await fetch(`/api/messages?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setLoading(false);
    }, 200);
    return () => window.clearTimeout(id);
  }, [query, status]);

  return (
    <DashboardShell
      title="Message History"
      subtitle="Email/Slack outreach logs for candidates across your recruiting team"
    >
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        placeholder="Search recipient, subject, or type..."
        statusOptions={[
          { value: "", label: "All statuses" },
          { value: "sent", label: "Sent" },
          { value: "queued", label: "Queued" },
          { value: "failed", label: "Failed" },
        ]}
      />

      {loading ? <LoadingBlock label="Loading messages..." /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="Reminder, pass/fail, invite, and offer emails will appear here."
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <Table headers={["When", "From", "To", "Type", "Subject", "Status", ""]}>
          {items.map((item) => (
            <tr key={item._id}>
              <Td className="whitespace-nowrap text-xs text-[var(--muted)]">
                {formatDateTime(item.createdAt)}
              </Td>
              <Td>{item.fromUserId?.username || "—"}</Td>
              <Td>{item.toEmail}</Td>
              <Td className="capitalize">{item.type.replaceAll("_", " ")}</Td>
              <Td className="max-w-xs truncate">{item.subject}</Td>
              <Td>
                <Badge className={statusTone[item.status]}>{item.status}</Badge>
              </Td>
              <Td>
                <Button size="sm" variant="secondary" onClick={() => setSelected(item)}>
                  View
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      ) : null}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.subject || "Message"}
      >
        {selected ? (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--muted)]">To:</span> {selected.toEmail}
            </p>
            <p>
              <span className="text-[var(--muted)]">Channel:</span> {selected.channel}
            </p>
            <p>
              <span className="text-[var(--muted)]">Status:</span> {selected.status}
            </p>
            {selected.error ? (
              <p className="text-rose-500">Error: {selected.error}</p>
            ) : null}
            <div className="mt-3 whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              {selected.body}
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardShell>
  );
}

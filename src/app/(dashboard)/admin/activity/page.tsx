"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Table, Td } from "@/components/ui/Table";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState, LoadingBlock } from "@/components/ui/Loading";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils/dates";

interface ActivityItem {
  _id: string;
  action: string;
  entityType: string;
  summary: string;
  createdAt: string;
  actorId?: { username?: string; email?: string; role?: string };
}

export default function AdminActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");

  useEffect(() => {
    const id = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ pageSize: "50" });
      if (query.trim()) params.set("q", query.trim());
      if (action) params.set("action", action);
      const res = await fetch(`/api/activity?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setLoading(false);
    }, 200);
    return () => window.clearTimeout(id);
  }, [query, action]);

  return (
    <DashboardShell
      title="Activity Log"
      subtitle="Audit trail of hiring decisions, offers, and account changes"
    >
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        status={action}
        onStatusChange={setAction}
        placeholder="Search activity summary..."
        statusOptions={[
          { value: "", label: "All actions" },
          { value: "candidate.pass_hr", label: "HR Pass" },
          { value: "candidate.pass_tech", label: "Tech Pass" },
          { value: "candidate.mark_hired", label: "Mark Hired" },
          { value: "offer.send", label: "Offer Sent" },
          { value: "assessment.pass", label: "Assessment Pass" },
          { value: "assessment.fail", label: "Assessment Fail" },
          { value: "auth.login", label: "Login" },
        ]}
      />

      {loading ? <LoadingBlock label="Loading activity..." /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Pipeline actions and logins will show up here automatically."
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <Table headers={["When", "Actor", "Action", "Summary"]}>
          {items.map((item) => (
            <tr key={item._id}>
              <Td className="whitespace-nowrap text-xs text-[var(--muted)]">
                {formatDateTime(item.createdAt)}
              </Td>
              <Td>
                <div className="font-medium">{item.actorId?.username || "System"}</div>
                <div className="text-xs capitalize text-[var(--muted)]">
                  {item.actorId?.role || "—"}
                </div>
              </Td>
              <Td>
                <Badge className="bg-[var(--surface-2)] text-[var(--foreground)]">
                  {item.action}
                </Badge>
              </Td>
              <Td>{item.summary}</Td>
            </tr>
          ))}
        </Table>
      ) : null}
    </DashboardShell>
  );
}

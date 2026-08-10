"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingBlock } from "@/components/ui/Loading";
import { formatDateTime } from "@/lib/utils/dates";

interface OfferItem {
  _id: string;
  title: string;
  contentHtml: string;
  fileUrl?: string;
  status: "sent" | "accepted" | "declined";
  sentAt?: string;
  createdAt: string;
}

const tone: Record<OfferItem["status"], string> = {
  sent: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100",
  declined: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
};

export default function CandidateOffersPage() {
  const [items, setItems] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/candidate/offers");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(offerId: string, decision: "accepted" | "declined") {
    setBusyId(offerId);
    const res = await fetch("/api/candidate/offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, decision }),
    });
    const data = await res.json();
    setBusyId("");
    setMessage(
      res.ok
        ? decision === "accepted"
          ? "Congratulations! Offer accepted."
          : "Offer declined. The hiring team has been notified."
        : data.error || "Action failed"
    );
    if (res.ok) load();
  }

  return (
    <DashboardShell
      title="My Offers"
      subtitle="Review offer letters and accept or decline"
    >
      {message ? <p className="mb-4 text-sm text-[var(--primary)]">{message}</p> : null}
      {loading ? <LoadingBlock label="Loading offers..." /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="No offer letters yet"
          description="When an admin sends an offer, it will appear here for your decision."
        />
      ) : null}

      <div className="grid gap-4">
        {items.map((offer) => (
          <Card key={offer._id}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{offer.title}</h3>
                <p className="text-xs text-[var(--muted)]">
                  Sent {formatDateTime(offer.sentAt || offer.createdAt)}
                </p>
              </div>
              <Badge className={tone[offer.status]}>{offer.status}</Badge>
            </div>

            <div
              className="prose prose-sm max-w-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: offer.contentHtml }}
            />

            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <a
                href={`/api/candidate/offers/${offer._id}/download`}
                target="_blank"
                className="text-[var(--primary)] underline"
              >
                Download / Print PDF
              </a>
              {offer.fileUrl ? (
                <a
                  href={offer.fileUrl}
                  target="_blank"
                  className="text-[var(--primary)] underline"
                >
                  Attached file
                </a>
              ) : null}
            </div>

            {offer.status === "sent" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="success"
                  disabled={busyId === offer._id}
                  onClick={() => decide(offer._id, "accepted")}
                >
                  Accept offer
                </Button>
                <Button
                  variant="danger"
                  disabled={busyId === offer._id}
                  onClick={() => decide(offer._id, "declined")}
                >
                  Decline offer
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils/dates";

interface InboxItem {
  _id: string;
  title: string;
  body: string;
  href?: string;
  type: string;
  readAt?: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    const res = await fetch("/api/inbox", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items || []);
    setUnreadCount(data.unreadCount || 0);
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, []);

  async function markAllRead() {
    await fetch("/api/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    load();
  }

  async function markOne(id: string) {
    await fetch("/api/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    load();
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[min(92vw,380px)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Notifications</p>
            <Button size="sm" variant="ghost" onClick={markAllRead} disabled={!unreadCount}>
              Mark all read
            </Button>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {items.length === 0 ? (
              <p className="rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--muted)]">
                No notifications yet.
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item._id}
                  className={`rounded-xl border p-3 ${
                    item.readAt
                      ? "border-[var(--border)]"
                      : "border-[var(--primary)]/30 bg-[var(--primary)]/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{item.body}</p>
                      <p className="mt-1 text-[10px] text-[var(--muted)]">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    {!item.readAt ? (
                      <Button size="sm" variant="ghost" onClick={() => markOne(item._id)}>
                        Read
                      </Button>
                    ) : null}
                  </div>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="mt-2 inline-block text-xs text-[var(--primary)] underline"
                      onClick={() => {
                        void markOne(item._id);
                        setOpen(false);
                      }}
                    >
                      Open
                    </Link>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState, LoadingBlock } from "@/components/ui/Loading";
import { formatDateTime } from "@/lib/utils/dates";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils/cn";

interface ThreadItem {
  _id: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  recruiter?: { _id: string; username?: string; avatarUrl?: string };
  candidate?: { _id: string; username?: string; avatarUrl?: string };
}

interface MessageItem {
  _id: string;
  body: string;
  createdAt: string;
  senderId?:
    | string
    | { _id: string; username?: string; avatarUrl?: string; role?: string };
}

export function ChatPanel({
  title,
  subtitle,
  counterpartLabel,
  readOnly = false,
}: {
  title: string;
  subtitle: string;
  counterpartLabel: "recruiter" | "candidate" | "both";
  /** Admins oversee conversations; they can still leave a note if false. */
  readOnly?: boolean;
}) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function loadThreads() {
    const res = await fetch("/api/chat/threads");
    const data = await res.json();
    const items = (data.items || []) as ThreadItem[];
    setThreads(items);
    if (!activeId && items[0]?._id) setActiveId(items[0]._id);
    setLoading(false);
    return items;
  }

  async function loadMessages(threadId: string) {
    if (!threadId) return;
    const res = await fetch(`/api/chat/threads/${threadId}/messages`);
    const data = await res.json();
    if (res.ok) setMessages(data.items || []);
  }

  useEffect(() => {
    void loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
    const id = window.setInterval(() => {
      void loadMessages(activeId);
      void loadThreads();
    }, 8000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const active = useMemo(
    () => threads.find((t) => t._id === activeId) || null,
    [threads, activeId]
  );

  function peerName(thread: ThreadItem) {
    if (counterpartLabel === "both") {
      return `${thread.recruiter?.username || "Recruiter"} ↔ ${
        thread.candidate?.username || "Candidate"
      }`;
    }
    if (counterpartLabel === "candidate") {
      return thread.candidate?.username || "Candidate";
    }
    return thread.recruiter?.username || "Recruiter";
  }

  async function ensureThread() {
    setMessage("");
    const payload: Record<string, string> = {};

    if (user?.role === "recruiter") {
      const connected = await fetch("/api/connected").then((r) => r.json());
      const list = connected.candidates || connected.items || [];
      const first = list[0];
      const candidateUserId = first?.userId?._id || first?.userId;
      const candidateProfileId = first?._id;
      if (candidateUserId) payload.candidateUserId = String(candidateUserId);
      else if (candidateProfileId) payload.candidateProfileId = String(candidateProfileId);
      if (!payload.candidateUserId && !payload.candidateProfileId) {
        setMessage("No connected candidates yet — connect someone first.");
        return;
      }
    }

    if (user?.role === "admin") {
      setMessage("Admins oversee existing chats. Recruiters or candidates start conversations.");
      return;
    }

    const res = await fetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Could not open chat");
      return;
    }
    const items = await loadThreads();
    const id = data.item?._id || items[0]?._id;
    if (id) {
      setActiveId(id);
      setMobileShowThread(true);
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!activeId || !text.trim() || readOnly) return;
    setSending(true);
    const res = await fetch(`/api/chat/threads/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim() }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setMessage(data.error || "Send failed");
      return;
    }
    setText("");
    setMessages((prev) => [...prev, data.item]);
    void loadThreads();
  }

  function senderIdOf(m: MessageItem) {
    if (!m.senderId) return "";
    return typeof m.senderId === "string" ? m.senderId : m.senderId._id;
  }

  function senderName(m: MessageItem) {
    if (!m.senderId || typeof m.senderId === "string") return "User";
    return m.senderId.username || "User";
  }

  return (
    <DashboardShell title={title} subtitle={subtitle}>
      {message ? <p className="mb-3 text-sm text-[var(--primary)]">{message}</p> : null}
      {loading ? <LoadingBlock label="Loading chat..." /> : null}

      {!loading && threads.length === 0 ? (
        <Card className="space-y-3">
          <EmptyState
            title="No conversations yet"
            description={
              counterpartLabel === "both"
                ? "When recruiters and candidates chat, threads appear here for oversight."
                : counterpartLabel === "recruiter"
                  ? "Start a chat with your assigned recruiter."
                  : "Open a chat with an assigned candidate from Connected, or wait for them to message you."
            }
          />
          {user?.role === "candidate" || user?.role === "recruiter" ? (
            <Button onClick={ensureThread}>
              {user?.role === "candidate" ? "Message my recruiter" : "Start a conversation"}
            </Button>
          ) : null}
        </Card>
      ) : null}

      {!loading && threads.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card
            className={cn(
              "max-h-[70vh] space-y-2 overflow-y-auto p-3",
              mobileShowThread ? "hidden lg:block" : "block"
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Conversations</p>
              {(user?.role === "candidate" || user?.role === "recruiter") && (
                <Button size="sm" variant="secondary" onClick={ensureThread}>
                  New
                </Button>
              )}
            </div>
            {threads.map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => {
                  setActiveId(t._id);
                  setMobileShowThread(true);
                }}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-left transition",
                  activeId === t._id
                    ? "border-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-[var(--border)] hover:bg-[var(--surface-2)]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{peerName(t)}</p>
                  {(t.unreadCount || 0) > 0 ? (
                    <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] text-white">
                      {t.unreadCount}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-[var(--muted)]">
                  {t.lastMessagePreview || "No messages yet"}
                </p>
              </button>
            ))}
          </Card>

          <Card
            className={cn(
              "flex max-h-[70vh] flex-col p-0",
              mobileShowThread ? "block" : "hidden lg:flex"
            )}
          >
            <div className="border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="lg:hidden"
                  onClick={() => setMobileShowThread(false)}
                >
                  ← Back
                </Button>
                <div>
                  <p className="font-semibold">
                    {active ? peerName(active) : "Select a conversation"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {active?.lastMessageAt
                      ? `Last activity ${formatDateTime(active.lastMessageAt)}`
                      : "HireFlow secure chat"}
                    {readOnly ? " · Read-only oversight" : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => {
                const mine = senderIdOf(m) === user?.id;
                return (
                  <div
                    key={m._id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm sm:max-w-[80%]",
                        mine
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface-2)] text-[var(--foreground)]"
                      )}
                    >
                      {!mine ? (
                        <p className="mb-1 text-[11px] opacity-70">{senderName(m)}</p>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          mine ? "text-white/70" : "text-[var(--muted)]"
                        )}
                      >
                        {formatDateTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {readOnly ? (
              <div className="border-t border-[var(--border)] p-3 text-xs text-[var(--muted)]">
                Admin oversight is read-only. Participants continue the conversation from their Chat
                page.
              </div>
            ) : (
              <form
                onSubmit={send}
                className="flex gap-2 border-t border-[var(--border)] p-3"
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message..."
                  disabled={!activeId || sending}
                />
                <Button type="submit" disabled={!activeId || sending || !text.trim()}>
                  Send
                </Button>
              </form>
            )}
          </Card>
        </div>
      ) : null}
    </DashboardShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { ToastItem } from "@/components/ui/Toast";
import { canJoinInterview, minutesUntil } from "@/lib/utils/dates";

interface InterviewLike {
  _id: string;
  scheduledAt: string;
  googleMeetLink?: string;
  stage?: string;
  candidateId?: { name?: string } | string;
}

const STORAGE_KEY = "hireflow:interview-alert-seen";

/** Module-level set survives route remounts of DashboardShell. */
const seenGlobal = new Set<string>();

function loadSeen() {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    for (const key of JSON.parse(raw) as string[]) seenGlobal.add(key);
  } catch {
    // ignore
  }
}

function persistSeen(key: string) {
  seenGlobal.add(key);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...seenGlobal]));
  } catch {
    // ignore quota errors
  }
}

loadSeen();

export function useInterviewAlerts(enabled = true) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    loadSeen();

    async function poll() {
      try {
        await fetch("/api/jobs/reminders", { method: "POST" }).catch(() => null);
        const res = await fetch("/api/interviews?status=scheduled", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.items || []) as InterviewLike[];

        for (const interview of items) {
          const mins = minutesUntil(interview.scheduledAt);
          const joinReady = canJoinInterview(interview.scheduledAt);
          const kind = joinReady ? "join" : mins > 0 && mins <= 15 ? "soon" : null;
          if (!kind) continue;

          const key = `${interview._id}:${kind}`;
          if (seenGlobal.has(key)) continue;

          if (kind === "join" && interview.googleMeetLink) {
            persistSeen(key);
            const name =
              typeof interview.candidateId === "object"
                ? interview.candidateId?.name
                : undefined;
            if (cancelled) continue;
            setToasts((prev) => {
              if (prev.some((t) => t.id === key)) return prev;
              return [
                {
                  id: key,
                  title: "Interview starting now",
                  body: `${(interview.stage || "interview").toUpperCase()}${
                    name ? ` with ${name}` : ""
                  } — join Google Meet`,
                  actionLabel: "Join the Interview",
                  href: interview.googleMeetLink,
                },
                ...prev,
              ].slice(0, 3);
            });
          } else if (kind === "soon") {
            persistSeen(key);
            if (cancelled) continue;
            setToasts((prev) => {
              if (prev.some((t) => t.id === key)) return prev;
              return [
                {
                  id: key,
                  title: "Interview in about 15 minutes",
                  body: "A reminder email is being sent to recruiter and candidate.",
                },
                ...prev,
              ].slice(0, 3);
            });
          }
        }
      } catch {
        // ignore transient polling errors
      }
    }

    void poll();
    const id = window.setInterval(() => {
      if (!cancelled) void poll();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  function dismiss(id: string) {
    persistSeen(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { toasts, dismiss };
}

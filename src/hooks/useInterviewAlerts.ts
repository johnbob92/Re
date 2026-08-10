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

export function useInterviewAlerts(enabled = true) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const seen = new Set<string>();

    async function poll() {
      try {
        await fetch("/api/jobs/reminders", { method: "POST" }).catch(() => null);
        const res = await fetch("/api/interviews", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.items || []) as InterviewLike[];

        for (const interview of items) {
          const mins = minutesUntil(interview.scheduledAt);
          const joinReady = canJoinInterview(interview.scheduledAt);
          const key = `${interview._id}:${joinReady ? "join" : mins <= 15 ? "soon" : "idle"}`;

          if (seen.has(key)) continue;

          if (joinReady && interview.googleMeetLink) {
            seen.add(key);
            const name =
              typeof interview.candidateId === "object"
                ? interview.candidateId?.name
                : undefined;
            setToasts((prev) => [
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
            ]);
          } else if (mins > 0 && mins <= 15) {
            seen.add(key);
            setToasts((prev) => [
              {
                id: key,
                title: "Interview in about 15 minutes",
                body: "A reminder email is being sent to recruiter and candidate.",
              },
              ...prev,
            ]);
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
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { toasts, dismiss };
}

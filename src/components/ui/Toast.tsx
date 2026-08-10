"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  actionLabel?: string;
  href?: string;
}

function AutoDismiss({
  id,
  onDismiss,
  ms = 12000,
}: {
  id: string;
  onDismiss: (id: string) => void;
  ms?: number;
}) {
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(id), ms);
    return () => window.clearTimeout(t);
  }, [id, ms, onDismiss]);
  return null;
}

export function ToastStack({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            className="pointer-events-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl"
          >
            <AutoDismiss id={item.id} onDismiss={onDismiss} />
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[var(--primary)]/10 p-2 text-[var(--primary)]">
                <BellRing className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.body ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">{item.body}</p>
                ) : null}
                {item.href && item.actionLabel ? (
                  <a href={item.href} target="_blank" rel="noreferrer">
                    <Button size="sm" className="mt-3" variant="success">
                      {item.actionLabel}
                    </Button>
                  </a>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Dismiss"
                onClick={() => onDismiss(item.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

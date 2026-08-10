"use client";

import { cn } from "@/lib/utils/cn";

export function LoadingBlock({
  label = "Loading...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        {label}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils/cn";
import { motion } from "framer-motion";

export function Card({
  className,
  children,
  hover = false,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={hover ? { y: -2, scale: 1.005 } : undefined}
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card hover className="relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: accent || "var(--primary)" }}
      />
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </Card>
  );
}

"use client";

import { cn } from "@/lib/utils/cn";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "warning";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--primary)] text-white hover:opacity-90 shadow-sm shadow-[var(--primary)]/25",
  secondary:
    "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-3)]",
  ghost: "bg-transparent hover:bg-[var(--surface-2)] text-[var(--foreground)]",
  danger: "bg-rose-500 text-white hover:bg-rose-600",
  success: "bg-emerald-500 text-white hover:bg-emerald-600",
  warning: "bg-amber-500 text-white hover:bg-amber-600",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

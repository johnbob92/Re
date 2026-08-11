"use client";

import { cn } from "@/lib/utils/cn";

export function Table({
  headers,
  children,
  className,
}: {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-x-auto rounded-2xl border border-[var(--border)] [-webkit-overflow-scrolling:touch]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[var(--surface)] to-transparent md:hidden" />
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--surface-2)] text-[var(--muted)]">
          <tr>
            {headers.map((h, index) => (
              <th
                key={h}
                className={cn(
                  "whitespace-nowrap px-3 py-3 font-medium sm:px-4",
                  index === 0 &&
                    "sticky left-0 z-[1] bg-[var(--surface-2)] shadow-[1px_0_0_var(--border)]"
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
  sticky = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Stick first column on horizontal scroll (mobile). */
  sticky?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-3 py-3 align-middle sm:px-4",
        sticky &&
          "sticky left-0 z-[1] bg-[var(--surface)] shadow-[1px_0_0_var(--border)]",
        className
      )}
    >
      {children}
    </td>
  );
}

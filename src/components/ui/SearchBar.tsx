"use client";

import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";

export function SearchBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  statusOptions,
  placeholder = "Search...",
  right,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  placeholder?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          className="pl-9"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      {statusOptions && onStatusChange ? (
        <Select
          className="sm:w-56"
          value={status || ""}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      ) : null}
      {right}
    </div>
  );
}

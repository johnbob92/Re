"use client";

import { useMemo, useRef } from "react";
import { Bold, Heading2, Italic, Link2, List, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after = before
) {
  const selected = value.slice(start, end) || "text";
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  return {
    next,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length,
  };
}

export function RichTextEditor({
  value,
  onChange,
  label = "Content",
  previewVars,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  previewVars?: Record<string, string>;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const previewHtml = useMemo(() => {
    let html = value || "<p><em>Nothing to preview yet.</em></p>";
    if (previewVars) {
      html = html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => previewVars[key] ?? "");
    }
    return html;
  }, [value, previewVars]);

  function apply(before: string, after?: string) {
    const el = ref.current;
    if (!el) {
      onChange(`${before}${value}${after ?? before}`);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const result = wrapSelection(value, start, end, before, after);
    onChange(result.next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex flex-wrap gap-1">
          <Button type="button" size="sm" variant="secondary" onClick={() => apply("<strong>", "</strong>")}>
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => apply("<em>", "</em>")}>
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => apply("<h2>", "</h2>")}>
            <Heading2 className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => apply("<ul><li>", "</li></ul>")}>
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => apply('<a href="https://">', "</a>")}
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-40 font-mono text-xs"
      />

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
        <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)]">
          <Eye className="h-3.5 w-3.5" />
          Live preview
        </p>
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>
    </div>
  );
}

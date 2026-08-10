"use client";

import { useRef, useState } from "react";
import { Upload, Link2, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

type Folder = "resumes" | "recordings" | "avatars" | "offers";

export function FileUpload({
  folder,
  accept = "*/*",
  value,
  onChange,
  label = "Upload file",
  className,
}: {
  folder: Folder;
  accept?: string;
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          folder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload URL failed");

      if (data.demo) {
        // Offline/demo mode: store generated public URL without binary upload
        onChange(data.publicUrl);
        setDemo(true);
        return;
      }

      const put = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("S3 upload failed");
      onChange(data.publicUrl);
      setDemo(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Uploading..." : label}
        </Button>
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--primary)] underline"
          >
            <Link2 className="h-3.5 w-3.5" />
            Open URL
          </a>
        ) : null}
        {value ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved
          </span>
        ) : null}
      </div>

      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste S3 URL directly"
      />

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.currentTarget.value = "";
        }}
      />

      {demo ? (
        <p className="text-xs text-amber-600">
          Demo mode: AWS credentials not configured. A placeholder S3 URL was saved.
        </p>
      ) : null}
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

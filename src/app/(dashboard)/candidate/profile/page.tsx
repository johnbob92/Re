"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export default function CandidateProfilePage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    whatsapp: "",
    location: "",
    linkedinUrl: "",
    resumeUrl: "",
    majorStack: "",
    experienceYears: "0",
    techStack: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setForm({
          username: d.user?.username || "",
          email: d.user?.email || "",
          whatsapp: d.profile?.whatsapp || "",
          location: d.profile?.location || "",
          linkedinUrl: d.profile?.linkedinUrl || "",
          resumeUrl: d.profile?.resumeUrl || "",
          majorStack: d.profile?.majorStack || "",
          experienceYears: String(d.profile?.experienceYears ?? 0),
          techStack: (d.profile?.techStack || []).join(", "),
        });
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        experienceYears: Number(form.experienceYears || 0),
        techStack: form.techStack.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Profile saved" : data.error || "Failed");
  }

  async function requestUpload() {
    if (!form.resumeUrl.includes(".")) {
      // helper to create presigned URL placeholder
    }
    const filename = prompt("Resume filename (e.g. resume.pdf)");
    if (!filename) return;
    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        contentType: "application/pdf",
        folder: "resumes",
      }),
    });
    const data = await res.json();
    if (data.publicUrl) {
      setForm((prev) => ({ ...prev, resumeUrl: data.publicUrl }));
      setMessage(
        data.demo
          ? "Demo S3 URL generated. Configure AWS credentials for real uploads."
          : "Presigned upload URL ready — upload file then save profile."
      );
    }
  }

  return (
    <DashboardShell title="My Profile" subtitle="Keep your contact details and resume URL up to date">
      <Card>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Username">
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={form.email} disabled />
          </Field>
          <Field label="WhatsApp">
            <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="LinkedIn URL">
            <Input value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} />
          </Field>
          <Field label="Major Stack">
            <Input value={form.majorStack} onChange={(e) => setForm({ ...form, majorStack: e.target.value })} />
          </Field>
          <Field label="Tech Stack">
            <Input value={form.techStack} onChange={(e) => setForm({ ...form, techStack: e.target.value })} />
          </Field>
          <Field label="Experience Years">
            <Input
              type="number"
              value={form.experienceYears}
              onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
            />
          </Field>
          <Field label="Resume URL (S3)" className="md:col-span-2">
            <div className="flex gap-2">
              <Input
                value={form.resumeUrl}
                onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
              />
              <Button type="button" variant="secondary" onClick={requestUpload}>
                S3 URL
              </Button>
            </div>
          </Field>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit">Save</Button>
            {message ? <span className="text-sm text-[var(--primary)]">{message}</span> : null}
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}

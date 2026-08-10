"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { FileUpload } from "@/components/ui/FileUpload";

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
          <Field label="Resume (AWS S3)" className="md:col-span-2">
            <FileUpload
              folder="resumes"
              accept=".pdf,.doc,.docx,application/pdf"
              label="Upload resume"
              value={form.resumeUrl}
              onChange={(resumeUrl) => setForm({ ...form, resumeUrl })}
            />
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

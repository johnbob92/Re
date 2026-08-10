"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";

export default function AdminProfilePage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    companyName: "",
    companyDescription: "",
    companyWebsiteUrl: "",
    calendlyUrl: "",
    offerLetterTemplateHtml: "",
    currentPassword: "",
    newPassword: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setForm((prev) => ({
          ...prev,
          username: d.user?.username || "",
          email: d.user?.email || "",
          companyName: d.profile?.companyName || "",
          companyDescription: d.profile?.companyDescription || "",
          companyWebsiteUrl: d.profile?.companyWebsiteUrl || "",
          calendlyUrl: d.profile?.calendlyUrl || "",
          offerLetterTemplateHtml: d.profile?.offerLetterTemplateHtml || "",
        }));
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setMessage(res.ok ? "Profile saved" : data.error || "Save failed");
  }

  return (
    <DashboardShell title="Admin Profile" subtitle="Company details, Calendly, and offer letter template">
      <Card>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Username">
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input value={form.email} disabled />
          </Field>
          <Field label="Company Name">
            <Input
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </Field>
          <Field label="Company Website URL">
            <Input
              value={form.companyWebsiteUrl}
              onChange={(e) => setForm({ ...form, companyWebsiteUrl: e.target.value })}
            />
          </Field>
          <Field label="Calendly URL" className="md:col-span-2">
            <Input
              value={form.calendlyUrl}
              onChange={(e) => setForm({ ...form, calendlyUrl: e.target.value })}
              placeholder="https://calendly.com/hiring-manager"
            />
          </Field>
          <Field label="Company Description" className="md:col-span-2">
            <Textarea
              value={form.companyDescription}
              onChange={(e) => setForm({ ...form, companyDescription: e.target.value })}
            />
          </Field>
          <Field label="Offer Letter Template (HTML)" className="md:col-span-2">
            <Textarea
              value={form.offerLetterTemplateHtml}
              onChange={(e) => setForm({ ...form, offerLetterTemplateHtml: e.target.value })}
            />
          </Field>
          <Field label="Current password">
            <Input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            />
          </Field>
          <Field label="New password">
            <Input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit">Save profile</Button>
            {message ? <span className="text-sm text-[var(--primary)]">{message}</span> : null}
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}

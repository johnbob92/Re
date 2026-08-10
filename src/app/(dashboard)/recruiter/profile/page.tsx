"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { FileUpload } from "@/components/ui/FileUpload";
import { AVATAR_OPTIONS } from "@/data/avatars";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "information" | "notification";

interface Template {
  _id?: string;
  type: string;
  subject: string;
  body: string;
}

export default function RecruiterProfilePage() {
  const { refresh } = useAuth();
  const [tab, setTab] = useState<Tab>("information");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    username: "",
    avatarUrl: "",
    location: "",
    phone: "",
    calendlyUrl: "",
    customAvatarUrl: "",
    timezone: "America/New_York",
    availableWeekdays: [1, 2, 3, 4, 5] as number[],
    availableFrom: "09:00",
    availableTo: "17:00",
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedType, setSelectedType] = useState("reminder");

  const weekdayLabels = [
    { value: 0, label: "Sun" },
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
  ];

  useEffect(() => {
    Promise.all([fetch("/api/profile"), fetch("/api/notifications")]).then(
      async ([pRes, nRes]) => {
        const p = await pRes.json();
        const n = await nRes.json();
        setForm({
          username: p.user?.username || "",
          avatarUrl: p.user?.avatarUrl || "",
          location: p.profile?.location || "",
          phone: p.profile?.phone || p.user?.phone || "",
          calendlyUrl: p.profile?.calendlyUrl || "",
          customAvatarUrl: "",
          timezone: p.profile?.timezone || "America/New_York",
          availableWeekdays: p.profile?.availableWeekdays || [1, 2, 3, 4, 5],
          availableFrom: p.profile?.availableFrom || "09:00",
          availableTo: p.profile?.availableTo || "17:00",
        });
        setTemplates(n.items || []);
      }
    );
  }, []);

  const currentTemplate =
    templates.find((t) => t.type === selectedType) || {
      type: selectedType,
      subject: "",
      body: "",
    };

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    const avatarUrl = form.customAvatarUrl || form.avatarUrl;
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, avatarUrl }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Profile updated" : data.error || "Failed");
    await refresh();
  }

  async function saveTemplate(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentTemplate),
    });
    const data = await res.json();
    if (res.ok) {
      setTemplates((prev) => {
        const others = prev.filter((t) => t.type !== currentTemplate.type);
        return [...others, data.item];
      });
      setMessage("Notification template saved");
    } else setMessage(data.error || "Failed");
  }

  return (
    <DashboardShell title="Recruiter Profile" subtitle="Avatar, Calendly, and email notification samples">
      <div className="mb-4 flex gap-2">
        <Button
          variant={tab === "information" ? "primary" : "secondary"}
          onClick={() => setTab("information")}
        >
          Information
        </Button>
        <Button
          variant={tab === "notification" ? "primary" : "secondary"}
          onClick={() => setTab("notification")}
        >
          Notification
        </Button>
      </div>

      {message ? <p className="mb-3 text-sm text-[var(--primary)]">{message}</p> : null}

      {tab === "information" ? (
        <Card>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Username">
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Location">
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </Field>
              <Field label="Calendly URL">
                <Input
                  value={form.calendlyUrl}
                  onChange={(e) => setForm({ ...form, calendlyUrl: e.target.value })}
                  placeholder="https://calendly.com/your-handle"
                />
              </Field>
              <Field label="Timezone">
                <Select
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                >
                  <option value="America/New_York">US Eastern</option>
                  <option value="America/Chicago">US Central</option>
                  <option value="America/Denver">US Mountain</option>
                  <option value="America/Los_Angeles">US Pacific</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/London">London</option>
                  <option value="Asia/Kolkata">India</option>
                </Select>
              </Field>
              <Field label="Available from">
                <Input
                  type="time"
                  value={form.availableFrom}
                  onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
                />
              </Field>
              <Field label="Available to">
                <Input
                  type="time"
                  value={form.availableTo}
                  onChange={(e) => setForm({ ...form, availableTo: e.target.value })}
                />
              </Field>
              <Field label="Available weekdays" className="md:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {weekdayLabels.map((day) => {
                    const checked = form.availableWeekdays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            availableWeekdays: checked
                              ? form.availableWeekdays.filter((d) => d !== day.value)
                              : [...form.availableWeekdays, day.value].sort(),
                          })
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                          checked
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Upload custom avatar (AWS S3)" className="md:col-span-2">
                <FileUpload
                  folder="avatars"
                  accept="image/*"
                  label="Upload avatar image"
                  value={form.customAvatarUrl}
                  onChange={(customAvatarUrl) =>
                    setForm({ ...form, customAvatarUrl, avatarUrl: customAvatarUrl || form.avatarUrl })
                  }
                />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Choose from 60 avatars</p>
              <div className="grid max-h-72 grid-cols-6 gap-2 overflow-y-auto rounded-xl border border-[var(--border)] p-3 md:grid-cols-10">
                {AVATAR_OPTIONS.map((avatar) => (
                  <button
                    type="button"
                    key={avatar.id}
                    onClick={() => setForm({ ...form, avatarUrl: avatar.url, customAvatarUrl: "" })}
                    className={`rounded-xl border p-1 ${
                      form.avatarUrl === avatar.url
                        ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                        : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatar.url} alt={avatar.label} className="h-12 w-12 rounded-lg" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.customAvatarUrl || form.avatarUrl}
                alt="Selected avatar"
                className="h-14 w-14 rounded-full border border-[var(--border)]"
              />
              <Button type="submit">Save information</Button>
              <a
                href={form.calendlyUrl || "https://calendly.com"}
                target="_blank"
                className="text-sm text-[var(--primary)] underline"
              >
                Open Calendly
              </a>
            </div>
          </form>
        </Card>
      ) : (
        <Card>
          <form onSubmit={saveTemplate} className="space-y-4">
            <Field label="Message type">
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="reminder">Reminder (before interview)</option>
                <option value="waiting">Waiting (after interview)</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
              </Select>
            </Field>
            <Field label="Subject">
              <Input
                value={currentTemplate.subject}
                onChange={(e) =>
                  setTemplates((prev) => {
                    const others = prev.filter((t) => t.type !== selectedType);
                    return [
                      ...others,
                      { ...currentTemplate, type: selectedType, subject: e.target.value },
                    ];
                  })
                }
              />
            </Field>
            <Field label="Body">
              <Textarea
                value={currentTemplate.body}
                onChange={(e) =>
                  setTemplates((prev) => {
                    const others = prev.filter((t) => t.type !== selectedType);
                    return [
                      ...others,
                      { ...currentTemplate, type: selectedType, body: e.target.value },
                    ];
                  })
                }
              />
            </Field>
            <p className="text-xs text-[var(--muted)]">
              Available variables: {"{{candidateName}}"}, {"{{recruiterName}}"}, {"{{scheduledAt}}"},
              {" {{meetLink}}"}, {"{{companyName}}"}, {"{{stage}}"}
            </p>
            <Button type="submit">Save sample message</Button>
          </form>
        </Card>
      )}
    </DashboardShell>
  );
}

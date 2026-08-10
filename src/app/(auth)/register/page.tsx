"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { FileUpload } from "@/components/ui/FileUpload";
import { ThemeControls } from "@/components/theme/ThemeControls";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    rePassword: "",
    location: "",
    phone: "",
    whatsapp: "",
    birthday: "",
    linkedinUrl: "",
    resumeUrl: "",
    techStack: "React, Node.js",
    experienceYears: "3",
    majorStack: "React",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.rePassword) {
      setError("Passwords do not match");
      return;
    }
    if (!form.resumeUrl) {
      setError("Resume is required (upload to S3, then continue)");
      return;
    }

    setLoading(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          location: form.location,
          phone: form.phone,
          whatsapp: form.whatsapp,
          birthday: form.birthday,
          linkedinUrl: form.linkedinUrl,
          resumeUrl: form.resumeUrl,
          techStack: form.techStack.split(",").map((s) => s.trim()).filter(Boolean),
          experienceYears: Number(form.experienceYears || 0),
          majorStack: form.majorStack,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setUser(data.user);
      router.push("/candidate/state");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hero-grid min-h-screen px-4 py-8">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end">
        <ThemeControls />
      </div>
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl space-y-4 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl md:p-8"
      >
        <div>
          <h1 className="text-2xl font-bold">Create your candidate account</h1>
          <p className="text-sm text-[var(--muted)]">
            Public signup is for candidates only. Admin and recruiter accounts are created by a Super
            Admin. Already registered?{" "}
            <Link className="text-[var(--primary)] underline" href="/login">
              Sign in
            </Link>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name / Username">
            <Input
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              required
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              minLength={8}
            />
          </Field>
          <Field label="Re-password">
            <Input
              type="password"
              value={form.rePassword}
              onChange={(e) => update("rePassword", e.target.value)}
              required
            />
          </Field>
          <Field label="WhatsApp (preferred)">
            <Input
              value={form.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
            />
          </Field>
          <Field label="Birthday">
            <Input
              type="date"
              value={form.birthday}
              onChange={(e) => update("birthday", e.target.value)}
            />
          </Field>
          <Field label="Location">
            <Input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
            />
          </Field>
          <Field label="Total Experience Years">
            <Input
              type="number"
              min={0}
              value={form.experienceYears}
              onChange={(e) => update("experienceYears", e.target.value)}
            />
          </Field>
          <Field label="Tech Stack (comma separated)">
            <Input
              value={form.techStack}
              onChange={(e) => update("techStack", e.target.value)}
            />
          </Field>
          <Field label="Major Stack">
            <Input
              value={form.majorStack}
              onChange={(e) => update("majorStack", e.target.value)}
            />
          </Field>
          <Field label="LinkedIn URL">
            <Input
              value={form.linkedinUrl}
              onChange={(e) => update("linkedinUrl", e.target.value)}
              required
            />
          </Field>
          <Field label="Resume (AWS S3)" className="md:col-span-2">
            <FileUpload
              folder="resumes"
              accept=".pdf,.doc,.docx,application/pdf"
              label="Upload resume"
              value={form.resumeUrl}
              onChange={(resumeUrl) => update("resumeUrl", resumeUrl)}
            />
          </Field>
        </div>

        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account..." : "Create candidate account"}
        </Button>
      </motion.form>
    </div>
  );
}

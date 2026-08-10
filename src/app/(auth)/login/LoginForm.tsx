"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { ThemeControls } from "@/components/theme/ThemeControls";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types";

const DEMO: Record<string, { email: string; password: string; label: string }> = {
  superadmin: {
    email: "superadmin@hireflow.app",
    password: "SuperAdmin123!",
    label: "Super Admin",
  },
  admin: { email: "admin@hireflow.app", password: "Password123!", label: "Admin" },
  hr: { email: "hr@hireflow.app", password: "Password123!", label: "HR Recruiter" },
  tech: { email: "tech@hireflow.app", password: "Password123!", label: "Tech Recruiter" },
  candidate: {
    email: "candidate1@example.com",
    password: "Password123!",
    label: "Candidate",
  },
};

const HOME: Record<UserRole, string> = {
  superadmin: "/superadmin/dashboard",
  admin: "/admin/candidates",
  recruiter: "/recruiter/connected",
  candidate: "/candidate/state",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser, refresh } = useAuth();
  const [email, setEmail] = useState("admin@hireflow.app");
  const [password, setPassword] = useState("Password123!");
  const [demo, setDemo] = useState("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await fetch("/api/seed", { method: "POST" });
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setUser(data.user);
      await refresh();
      router.push(params.get("next") || HOME[data.user.role as UserRole]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hero-grid flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeControls />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-2xl lg:grid-cols-2"
      >
        <div className="relative hidden lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
            alt="Team meeting"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-8 text-white flex flex-col justify-end">
            <h2 className="text-3xl font-bold">Welcome back to HireFlow</h2>
            <p className="mt-2 text-sm text-white/80">
              Sign in to manage interviews, assessments, and offers.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6 md:p-10">
          <div>
            <h1 className="text-2xl font-bold">Sign in</h1>
            <p className="text-sm text-[var(--muted)]">
              New here?{" "}
              <Link href="/register" className="text-[var(--primary)] underline">
                Create an account
              </Link>
            </p>
          </div>

          <Field label="Quick demo account">
            <Select
              value={demo}
              onChange={(e) => {
                const key = e.target.value;
                setDemo(key);
                setEmail(DEMO[key].email);
                setPassword(DEMO[key].password);
              }}
            >
              {Object.entries(DEMO).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error ? <p className="text-sm text-rose-500">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { ThemeControls } from "@/components/theme/ThemeControls";
import { Button } from "@/components/ui/Button";

const features = [
  {
    icon: Users,
    title: "Multi-role hiring OS",
    desc: "Super Admin, Admin, HR/Tech Recruiters, and Candidates in one bright workspace.",
  },
  {
    icon: CalendarDays,
    title: "Calendly + Google Meet",
    desc: "Schedule interviews, auto-remind at T-15, and join Meet links at T-5.",
  },
  {
    icon: Mail,
    title: "Gmail-ready messaging",
    desc: "Reminder, waiting, pass/fail, tech invite, final invite, and offer templates.",
  },
  {
    icon: MessageSquare,
    title: "Slack hiring alerts",
    desc: "Keep your team in sync when interviews are booked or decisions are made.",
  },
];

export default function HomePage() {
  return (
    <div className="hero-grid min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">HireFlow</p>
            <p className="text-xs text-[var(--muted)]">Modern recruiter system</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeControls />
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--primary)]" />
            Clean · Modern · Bright · Dark-mode aware
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            Hire faster with a
            <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
              {" "}
              delightful recruiting OS
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted)] md:text-lg">
            Manage multi-admin organizations, HR and technical interview pipelines, assessments,
            Calendly scheduling, Google Calendar, Gmail outreach, Slack alerts, and S3 file URLs —
            all in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register">
              <Button size="lg">Create account</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                Explore demo accounts
              </Button>
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[
              ["4", "Roles"],
              ["3", "Interview stages"],
              ["6", "Color themes"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
              >
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-[var(--muted)]">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="relative"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
            alt="Modern hiring team collaboration"
            className="h-[420px] w-full rounded-[2rem] object-cover shadow-2xl shadow-[var(--primary)]/20"
          />
          <div className="absolute -bottom-5 left-5 right-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-4 backdrop-blur">
            <p className="text-sm font-semibold">Pipeline snapshot</p>
            <p className="text-xs text-[var(--muted)]">
              HR → Tech → Final → Offer, with override controls for admins and beautiful status badges.
            </p>
          </div>
        </motion.div>
      </main>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 md:grid-cols-2 xl:grid-cols-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <f.icon className="mb-3 h-5 w-5 text-[var(--primary)]" />
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{f.desc}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
}

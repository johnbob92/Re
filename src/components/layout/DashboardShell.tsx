"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Users,
  UserRound,
  Link2,
  Settings2,
  Sparkles,
  History,
  Mail,
  ChartColumn,
  MessageCircle,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeControls } from "@/components/theme/ThemeControls";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ToastStack } from "@/components/ui/Toast";
import { useInterviewAlerts } from "@/hooks/useInterviewAlerts";
import { cn } from "@/lib/utils/cn";
import type { UserRole } from "@/types";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV: Record<UserRole, NavItem[]> = {
  superadmin: [
    { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/superadmin/managing", label: "Managing", icon: Settings2 },
    { href: "/superadmin/activity", label: "Activity", icon: History },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/candidates", label: "Candidates", icon: Users },
    { href: "/admin/recruiters", label: "Recruiters", icon: BriefcaseBusiness },
    { href: "/admin/analytics", label: "Analytics", icon: ChartColumn },
    { href: "/admin/offers", label: "Offers", icon: ClipboardCheck },
    { href: "/admin/chat", label: "Chat", icon: MessageCircle },
    { href: "/admin/messages", label: "Email log", icon: Mail },
    { href: "/admin/activity", label: "Activity", icon: History },
    { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/admin/integrations", label: "Integrations", icon: Settings2 },
    { href: "/admin/profile", label: "Profile", icon: UserRound },
  ],
  recruiter: [
    { href: "/recruiter/connected", label: "Connected", icon: Link2 },
    { href: "/recruiter/scheduled", label: "Scheduled", icon: CalendarDays },
    { href: "/recruiter/assessment", label: "Assessment", icon: ClipboardCheck },
    { href: "/recruiter/chat", label: "Chat", icon: MessageCircle },
    { href: "/recruiter/messages", label: "Email log", icon: Mail },
    { href: "/recruiter/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/recruiter/profile", label: "Profile", icon: UserRound },
  ],
  candidate: [
    { href: "/candidate/state", label: "My Status", icon: Sparkles },
    { href: "/candidate/offers", label: "My Offers", icon: ClipboardCheck },
    { href: "/candidate/schedule", label: "Schedule", icon: CalendarDays },
    { href: "/candidate/chat", label: "Chat", icon: MessageCircle },
    { href: "/candidate/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/candidate/profile", label: "Profile", icon: UserRound },
  ],
};

function SidebarNavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function DashboardShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const items = user ? NAV[user.role] : [];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const alertsEnabled =
    user?.role === "recruiter" || user?.role === "candidate" || user?.role === "admin";
  const { toasts, dismiss } = useInterviewAlerts(Boolean(alertsEnabled));

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[var(--primary)]/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[var(--accent)]/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]/80 p-4 backdrop-blur md:flex">
          <Link href="/" className="mb-8 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">HireFlow</p>
              <p className="text-[11px] capitalize text-[var(--muted)]">{user?.role}</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            <SidebarNavLinks items={items} pathname={pathname} />
          </nav>

          <button
            onClick={logout}
            className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </aside>

        <main className="relative flex-1 p-4 md:p-8">
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 md:hidden"
                aria-label="Open navigation"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold tracking-tight md:text-3xl"
                >
                  {title}
                </motion.h1>
                {subtitle ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              <NotificationBell />
              <ThemeControls />
              {user ? (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.avatarUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=hireflow"}
                    alt=""
                    className="h-7 w-7 rounded-full bg-[var(--surface-2)]"
                  />
                  <span className="max-w-[120px] truncate text-sm font-medium sm:max-w-none">
                    {user.username}
                  </span>
                </div>
              ) : null}
            </div>
          </header>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium",
                  pathname.startsWith(item.href)
                    ? "bg-[var(--primary)] text-white"
                    : "border border-[var(--border)] bg-[var(--surface)]"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {children}
        </main>
      </div>

      <AnimatePresence>
        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              aria-label="Close navigation backdrop"
              className="absolute inset-0 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute inset-y-0 left-0 flex w-[min(84vw,280px)] flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">HireFlow</p>
                  <p className="text-[11px] capitalize text-[var(--muted)]">{user?.role}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close navigation"
                  className="rounded-lg p-2 hover:bg-[var(--surface-2)]"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1">
                <SidebarNavLinks
                  items={items}
                  pathname={pathname}
                  onNavigate={() => setMobileNavOpen(false)}
                />
              </nav>
              <button
                onClick={logout}
                className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <ToastStack items={toasts} onDismiss={dismiss} />
    </div>
  );
}

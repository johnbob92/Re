export type UserRole = "superadmin" | "admin" | "recruiter" | "candidate";

export type RecruiterType = "hr" | "tech";

export type AccountStatus = "active" | "inactive" | "invited" | "declined" | "deleted";

export type RecruiterStatus = "active" | "decline" | "invited";

export type SalaryType = "monthly" | "hourly";

export type CandidateStatus =
  | "need_to_connect"
  | "connected"
  | "declined"
  | "scheduled"
  | "hr_pass"
  | "hr_failed"
  | "tech_pass"
  | "tech_failed"
  | "final_pass"
  | "final_failed"
  | "offer_sent"
  | "hired";

export type InterviewStage = "hr" | "tech" | "final";

export type InterviewStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";

export type AssessmentDecision = "pass" | "fail" | "pending";

export type ThemeMode = "light" | "dark" | "auto";

export type ColorTheme =
  | "ocean"
  | "violet"
  | "emerald"
  | "sunset"
  | "rose"
  | "slate";

export type PerformanceView = "weekly" | "monthly" | "total";

export type NotificationMessageType =
  | "reminder"
  | "waiting"
  | "passed"
  | "failed"
  | "tech_invite"
  | "final_invite"
  | "offer";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  avatarUrl?: string;
  adminId?: string;
  recruiterType?: RecruiterType;
}

export interface JwtPayload extends AuthUser {
  iat?: number;
  exp?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalCandidates: number;
  scheduled: number;
  hrPass: number;
  hrFailed: number;
  techPass: number;
  techFailed: number;
  finalPass: number;
  finalFailed: number;
  hired: number;
  byStatus: { status: CandidateStatus; count: number }[];
  weeklyTrend: { week: string; scheduled: number; passed: number; failed: number }[];
}

export interface ApiError {
  error: string;
  details?: unknown;
}

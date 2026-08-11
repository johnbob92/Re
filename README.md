# HireFlow — Modern Recruiter System

Clean, modern multi-tenant recruiting platform built with:

- **React + Next.js (App Router)** frontend & API routes
- **MongoDB + Mongoose** with compound indexes for scale
- **Theme system**: bright/dark toggle, auto night mode, 6 color styles
- **Integrations**: Gmail/SMTP, Google Calendar + Meet, Calendly, Slack, AWS S3

## Roles

1. **Super Admin** — manage all users (reset password / role / delete), global dashboard + graphs
2. **Admin** — dashboard, company profile, recruiters, candidates pipeline, analytics, offer letters, **chat oversight**, calendar
3. **Recruiter (HR / Tech)** — connected candidates, scheduled interviews, assessments, chat, notification templates, calendar
4. **Candidate** — public register (candidate-only), schedule via Calendly, status tracking, chat with recruiter, calendar, join Meet at T-5

Public `/register` creates **candidates only**. Admin/recruiter roles are assigned by Super Admin (Managing users) or created via Admin recruiter invite flows.

## Hiring pipeline

`Need to Connect → Connected → Scheduled → HR Pass/Fail → Tech Pass/Fail → Final Pass/Fail → Offer → Hired`

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

By default `USE_MEMORY_DB=true` seeds an in-memory MongoDB with demo data on first API call.

### Persistent MongoDB (optional)

```bash
docker compose up -d
```

Then in `.env.local`:

```env
USE_MEMORY_DB=false
MONGODB_URI=mongodb://127.0.0.1:27017/recruiter-system
AUTO_SEED=true
```

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@hireflow.app` | `SuperAdmin123!` |
| Admin | `admin@hireflow.app` | `Password123!` |
| HR Recruiter | `hr@hireflow.app` | `Password123!` |
| Tech Recruiter | `tech@hireflow.app` | `Password123!` |
| Candidate | `candidate1@example.com` | `Password123!` |

## Production MongoDB

Set:

```env
USE_MEMORY_DB=false
MONGODB_URI=mongodb://127.0.0.1:27017/recruiter-system
AUTO_SEED=true
```

Then optionally run:

```bash
npm run seed
```

## MongoDB schema (performance-oriented)

Designed for ~50–100 admins, 2–10 recruiters/admin, 500–1000 candidates/recruiter:

- `User` — auth + role (`email` unique, `adminId+role+status`)
- `AdminProfile` — company + Calendly + offer template
- `RecruiterProfile` — HR/Tech, salary, paid, denormalized hired counters
- `CandidateProfile` — pipeline status + scheduled timestamps (`adminId+status+updatedAt`, `recruiterId+status`)
- `Interview` — Meet/Calendar links + reminder flags (`recruiterId+stage+scheduledAt`)
- `Assessment` — HR/Tech scorecards (unique `candidateId+stage`)
- `NotificationTemplate` — reminder/waiting/passed/failed samples
- `OfferLetter`, `Connection`, `MessageLog`

Only **URLs** for resumes/recordings are stored; binaries go to **AWS S3**.

## Integrations

Configure in `.env.local`:

- **S3**: `AWS_*` → `/api/uploads` returns presigned URLs (UI uploaders on candidate/recruiter/admin pages)
- **Gmail/SMTP**: `SMTP_*` or Gmail OAuth vars
- **Google Calendar**: `GOOGLE_*` + refresh token (demo Meet links if unset)
- **Calendly**: `CALENDLY_TOKEN` + per-user Calendly URLs
- **Slack**: `SLACK_BOT_TOKEN`

Admin UI: `/admin/integrations` shows connection status and Calendly/Slack controls.

Admin Offers UI: `/admin/offers` for offer templates, drafts, send history, accept/decline.

Calendly webhook: `POST /api/integrations/calendly/webhook` (`invitee.created`) auto-creates interviews + Meet links. Demo simulate via `PUT` with `{ email, startTime, eventName }`.

Auto reminder job endpoint: `POST /api/jobs/reminders` (T-15 emails, T-5 join toasts)

Interview join alerts poll every 30s in the dashboard shell for admin/recruiter/candidate roles.

CSV export buttons are available on Super Admin dashboard, Admin candidates/recruiters, and Recruiter connected/scheduled/assessment tables.

Offer letters include a formatting toolbar + live HTML preview.

Activity log: `/admin/activity` and `/superadmin/activity` (audit trail for pipeline/auth/user actions).

Message history: `/admin/messages` and `/recruiter/messages` (email/Slack send logs).

Basic in-memory rate limits protect login/register/webhooks/activity endpoints.

In-app notification inbox (bell icon) for pipeline/offer/interview events.

Admin bulk candidate CSV import: Candidates page → Import CSV (`/api/candidates/import`).

Candidate offer decisions: `/candidate/offers` (accept/decline sent offers).

Offer download / print-to-PDF: `/api/candidate/offers/:id/download` (candidate + admin).

Recruiter availability: timezone + weekday/time window on Recruiter Profile. Scheduling (manual + Calendly webhook) rejects times outside the window or overlapping existing interviews.

Admin pipeline dashboard: `/admin/dashboard` (default admin home) with charts + recent candidates.

Admin team analytics: `/admin/analytics` — pass rates by recruiter, stage breakdown, hire counters, CSV export.

Interview cancel / reschedule: recruiter Scheduled + candidate Schedule pages; `PATCH /api/interviews` actions `cancel` | `reschedule` (availability + conflict checks, calendar update/delete, notifications + audit).

Admin candidate search hits the API `q` parameter (debounced), not only client-side filtering.

Permission matrix utilities live in `src/lib/permissions.ts` (covered by `npm test`).

Admin chat oversight: `/admin/chat` (read-only view of recruiter ↔ candidate threads).

Rate limiting: in-memory by default; set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for multi-node Redis-backed limits (`rateLimitAsync`).

Mobile: hamburger drawer + sticky first table column + chat list/detail split on small screens.

Auth/theme boot: `/api/auth/me` is a soft 200 probe (`user: null` when logged out). Theme reads localStorage after mount + a pre-paint boot script to avoid hydration mismatch noise.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run seed
```

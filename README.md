# HireFlow — Modern Recruiter System

Clean, modern multi-tenant recruiting platform built with:

- **React + Next.js (App Router)** frontend & API routes
- **MongoDB + Mongoose** with compound indexes for scale
- **Theme system**: bright/dark toggle, auto night mode, 6 color styles
- **Integrations**: Gmail/SMTP, Google Calendar + Meet, Calendly, Slack, AWS S3

## Roles

1. **Super Admin** — manage all users (reset password / role / delete), global dashboard + graphs
2. **Admin** — company profile, recruiters, candidates pipeline, offer letters, calendar
3. **Recruiter (HR / Tech)** — connected candidates, scheduled interviews, assessments, notification templates, calendar
4. **Candidate** — register, schedule via Calendly, status tracking, calendar, join Meet at T-5

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

Auto reminder job endpoint: `POST /api/jobs/reminders` (T-15 emails, T-5 join toasts)

Interview join alerts poll every 30s in the dashboard shell for admin/recruiter/candidate roles.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run seed
```

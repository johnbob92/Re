# Resume Tailor Prompt

System prompt for a resume tailor tool. Feed it with:

1. This prompt (`prompts/resume-tailor-system.md`)
2. Candidate Profile JSON
3. Job Description
4. Optional Custom Instructions

The previous prompt produced tailored resumes around **ATS 80**. This revision targets **90+** match rate on Jobscan-class scorers without sounding like a keyword dump.

## What changed

**Higher ATS score**

- Builds an internal match map of required/preferred hard skills, architecture terms, domain language, soft skills, and acronym pairs
- Mirrors exact JD spelling, then adds parser variants (`React` / `React.js`, `AWS` / `Amazon Web Services`, `CI/CD` / `Continuous Integration`)
- Adds a JD-first `coreSkills` belt (12–18 tokens) and a `targetTitle` headline — two of the largest Jobscan levers
- Requires double placement for required skills and triple placement for high-frequency JD skills
- Surfaces `omittedUnsupportedKeywords` instead of silently dropping coverage or inventing stack

**Sharper tech skills**

- Splits **Languages** from **Backend** frameworks
- Expands cloud into platform + named services (`AWS Lambda`, `Amazon ECS`, `Amazon S3`)
- Caps each category at 4–10 JD-first tokens; drops hobby-stack noise
- Keeps stack integrity (no React+Angular, no random multi-cloud, one primary IaC tool per role) while allowing a verified secondary language when the JD asks for it

**Skill / domain design**

- New **Domain** category for product and industry nouns (payments, EHR, B2B SaaS) taken from real employers, then overlapping JD language
- **Architecture/Practices** carries Agile, Scrum, TDD, microservices, system design — terms ATS scorecards actually search
- AI entries are product names (Copilot, ChatGPT, Cursor), not the label “AI tool assistant”

**Humanity**

- Voice rules for a senior engineer talking to a hiring manager
- Varied sentence rhythm; bans leverage/spearhead/results-driven cadence
- Impact without fake metrics: use profile numbers when they exist, otherwise concrete operational language
- Latest role tells a story instead of marching Backend → Frontend → Cloud as a checklist
- Latest role uses 9–11 bullets: enough surface area for required keywords, without the 12-bullet laundry list. Add bullets to cover remaining required skills instead of stuffing. Custom Instructions still override counts.

## Usage

Copy the full contents of `prompts/resume-tailor-system.md` into the tailor tool’s prompt field. Keep identity facts in the profile JSON authoritative. Use Custom Instructions only for count, tone, or JSON-wrapper overrides.

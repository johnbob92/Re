# Resume Tailor Prompts

Two versions of a resume tailor system prompt live in `prompts/`. Both take the same three inputs:

1. Candidate Profile JSON
2. Job Description
3. Optional Custom Instructions

Pick the one that matches your tool's output format.

- `prompts/resume-tailor-system.md`: returns a structured JSON object (summary, skills by category, experience, education, certifications). Use this when the tailor tool renders the resume from a JSON schema.
- `prompts/resume-tailor-system-plaintext.md`: returns a finished, paste-ready resume as plain text. Shorter and easier to eyeball. Use this when the tool just wants the final document.

Custom Instructions can change bullet counts, tone, or (for the JSON prompt) the wrapper shape. Neither prompt lets Custom Instructions override the identity facts or the no-fabrication rules.

The original prompt this replaces produced tailored resumes that scored around ATS 80. Both versions here target 90 or higher on Jobscan-class match scorers, without turning the resume into a keyword dump.

## What changed from the original prompt

**Higher ATS score**

- Builds an internal match map of required and preferred hard skills, architecture terms, domain language, soft skills, and acronym pairs before writing anything
- Mirrors exact JD spelling, then adds the parser variant when it matters (React and React.js, AWS and Amazon Web Services, CI/CD and Continuous Integration)
- Adds a JD-first core skills list and a matched job-title headline, two of the largest levers in tools like Jobscan
- Requires each honestly claimed required skill to appear in the skills section and in at least one bullet or the summary; high-frequency JD skills get a third placement in the headline or summary
- Surfaces the skills that could not be honestly claimed instead of inventing stack or quietly dropping coverage

**Sharper tech skills**

- Splits programming Languages from Backend frameworks
- Expands Cloud into the platform name plus the actual services used (AWS Lambda, Amazon ECS, Amazon S3)
- Caps each category at 4 to 10 JD-first items and drops hobby-stack noise
- Keeps stack integrity (no React plus Angular, no random multi-cloud, one primary IaC tool per role) while still allowing a verified secondary language when the JD asks for it

**Skill and domain design**

- New Domain category for product and industry nouns (payments, EHR, B2B SaaS), pulled from the candidate's real employers first, then from JD language that honestly overlaps
- Architecture and Practices carries Agile, Scrum, TDD, microservices, and system design, the terms ATS scorecards actually search for
- AI tool entries are real product names (Copilot, ChatGPT, Cursor), never the generic label "AI tool assistant"

**Humanity and writing quality**

- Written in the voice of a senior engineer talking to a hiring manager, not an optimizer
- A banned-words list removes AI-sounding filler: leverage, utilize, spearhead, robust, seamless, cutting-edge, synergy, holistic, unlock, elevate, empower, unparalleled, foster, delve, and similar terms
- No em dash or en dash anywhere in the generated resume; periods, commas, colons, and parentheses do that work instead
- No more than two bullets per role share an opening verb, and no bullet anywhere opens with "Leveraged," "Spearheaded," or "Utilized"
- Impact language stays honest: profile metrics when they exist, concrete qualitative outcomes when they do not, never an invented percentage or dollar figure
- The most recent role reads as a short story of real work instead of a Backend-then-Frontend-then-Cloud checklist
- Default bullet counts are 9 to 11 for the latest role, 6 to 8 for the second, and 3 to 5 for older roles; Custom Instructions still override these

## Usage

Copy the full contents of one prompt file into the tailor tool's prompt field, then attach the profile JSON, job description, and any custom instructions. Keep the profile JSON as the single source of truth for identity facts (name, employer, title, dates, education, certifications); the prompt will not alter them.

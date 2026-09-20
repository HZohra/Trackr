# Trackr — Project Handoff

This document is the single source of truth for continuing the Trackr rebuild.
Read it fully before making changes. **Read the actual code in the repo too — don't
guess.** All current work is on the branch **`feat/angular-scaffold`** (NOT `main`;
`main` is the old team version, deliberately untouched).

Repo: https://github.com/HZohra/Trackr/tree/feat/angular-scaffold

---

## Who I am / what this is

I'm Astro (Zohra Haidary), a 4th-year CS student at Wilfrid Laurier. **Trackr** is a
student course & grade tracker: students add courses (manually or by uploading a
syllabus PDF that an AI extractor parses), and track assignments, due dates, grades,
GPA, and email reminders. It began as a CP476 team project; I'm rebuilding it solo
into a modern, production-ready app I fully control, and **deploying it for my resume**.

---

## Stack & repo layout

- **`frontend-angular/`** — the REAL frontend. Angular 21 (standalone components,
  Signals, Router, Reactive Forms, HttpClient), Tailwind CSS v4, strict TypeScript
  (**no `any`**).
- **`backend/`** — Node.js + Express (ES modules), now **100% PostgreSQL** via the
  `pg` driver. A real migration runner (`backend/src/db/migrate.js`) applies numbered
  SQL files from `backend/migrations/`. Models are callback-style but route through a
  shared `query()` / `withTransaction()` helper in `backend/src/config/db.js`. Auth is
  JWT + bcrypt; every query is ownership-scoped by `user_id`.
- **`frontend/`** — the OLD vanilla-JS frontend. Untouched, still works, to be deleted
  LAST once Angular fully replaces it. Useful design reference (esp. `js/adapters.js`).
- **`db/`** — OLD MySQL schema/migrations (legacy). The NEW Postgres migrations live in
  `backend/migrations/`.
- **Database**: a LOCAL PostgreSQL database named `trackr` on my Windows machine. I
  develop against local; **Azure Postgres is the future DEPLOY target** ($100 Azure for
  Students credit).

---

## Environment (`backend/.env` — gitignored, so you can't see it)

The backend expects these keys (values are on my machine only):

- `PORT` (5000)
- `DATABASE_URL` — points at local `trackr` (`postgres://postgres:<pw>@localhost:5432/trackr`)
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `APP_EMAIL`, `APP_EMAIL_PASSWORD` (Gmail app password — being rotated, so if it
  changes that's expected)
- `FRONTEND_URL`
- `CLAUDE_API` — **not set yet.** Needed for syllabus AI extraction (Anthropic API
  key). I have ~$40 credit coming; the key hasn't arrived. Until it's set, the upload
  flow shows a graceful "extraction failed" fallback.

Do NOT tell me to create a `.env` — I have one. `.env` and `node_modules` are gitignored.

---

## Running it (Windows / PowerShell)

Two dev servers, two terminals:

- Backend: `cd backend` → `npm start` (port **5000**)
- Angular: `cd frontend-angular` → `ng serve` (port **4200**)
- The old frontend uses port **3000**. CORS (`backend/src/config/cors.js`) currently
  allows `localhost:3000` AND `localhost:4200` — this is intentional, don't "fix" it.
- `psql` is NOT on my PATH. I run it via:
  `& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d trackr -c "..."`

---

## Database migrations — IMPORTANT

- Migrations already **applied** to my local `trackr`: `001_init.sql` (full schema) and
  `002_more_categories.sql` (adds Lab + Other categories).
- Do NOT re-run or edit applied migrations, and do NOT run destructive SQL against my
  DB. For any schema change: create a NEW numbered file in `backend/migrations/`, then
  I run `cd backend && npm run migrate` (the runner tracks applied files in a
  `schema_migrations` table and only applies new ones, each in a transaction).
- Category IDs: Assignment=1, Quiz=2, Exam=3, Project=4, Lab=5, Other=6.

---

## What's DONE

- Angular scaffold + Tailwind + `core/shared/features/layout` architecture +
  environment config (`apiBase`).
- **App shell** (`layout/main-layout/`): topbar (logo, collapse, search box [NOT wired],
  `+Add` menu, notification bell [placeholder], avatar menu with real name + working
  logout), sidebar nav, and a bottom-right AI assistant launcher (expandable, but
  PLACEHOLDER — no AI wired).
- **Routing**: guarded shell layout + child routes, active-nav highlighting
  (`app.routes.ts`).
- **Auth** (fully working end-to-end vs local Postgres): login + register pages
  (Reactive Forms + validation), `AuthService`, a JWT **token interceptor**
  (`core/interceptors/auth.interceptor.ts`), an **error interceptor**
  (`error.interceptor.ts`) that clears the session and redirects to `/login?expired=1`
  on any 401 (login page shows "Your session expired"), a **route guard**
  (`core/guards/auth.guard.ts`), logout, and signed-in identity in the shell.
- **Backend fully migrated MySQL → PostgreSQL** (user/course/activity/admin models);
  MySQL bridge removed; `mysql2` uninstalled; dead `DB_*` vars removed from `.env`;
  original connection-leak bugs fixed.
- **Courses page**: lists real courses from the API (cards with color accent, code pill,
  grade, progress).
- **Add course** (manual form) → `POST /user/courses/`. **Edit course** (form) →
  `PATCH /user/courses/:id`.
- **Course DETAIL page** (`features/courses/course-detail/`): course info, current grade
  (weighted-average, ported into `core/grade-math.ts`), progress bar, a "weights don't
  add up to 100%" warning flag, assignments split into Upcoming/Completed with overdue
  flags, and Edit / Archive / Delete (with confirm) buttons. Clicking a course card
  opens this.
- **Assignments page**: list with filter tabs (all/upcoming/overdue/completed),
  add-assignment form (course preselects when opened from a course page via `?course=`),
  and edit grade/status + delete via a popup.
- **Upload-syllabus flow** (UI + AI review + save) is BUILT but not live-testable until
  `CLAUDE_API` is set (see Environment). Graceful fallback until then.

### Key frontend files

- Services: `core/services/{auth,course,activity}.service.ts`
- Models: `core/models/{course,activity}.ts`
- Grade math (ported from old `adapters.js`): `core/grade-math.ts`
  — NOTE: "current grade" = weighted average of _graded_ work only (ungraded weight is
  ignored), which is why the 100%-weight flag matters. Build the projection calculator
  with this in mind.
- Routes present: `/login`, `/register` (public); and under the guarded shell:
  `/dashboard`, `/courses`, `/courses/new`, `/courses/upload`, `/courses/:id`,
  `/courses/:id/edit`, `/assignments`, `/assignments/new`, `/calendar`, `/grades`.

---

## Known minor issues to fix cleanly

- The add-assignment `<select>` preselect (`?course=NN`) sets a numeric control value,
  but `<select>` options use string values — so it may not _visually_ show selected.
  Fix: coerce to string (`patchValue({ courseId: String(preselect) })`) or use a proper
  reactive-forms value.
- Dashboard, Calendar, Grades pages are placeholders (no real content yet).

---

## IMMEDIATE NEXT STEPS (where we left off)

1. Course detail: deadline **countdowns** + pin the midterm & final with days-left.
2. **Inline assignment editing** directly on the course detail page (reuse the existing
   edit popup from the Assignments page).
3. Smarter **"Add course"** that also asks for all assignments, with a LIVE running
   weight total that flags when it isn't 100%.
4. A **"what do I need on the final?"** grade-projection calculator.

## BIGGER ROADMAP (after the core loop)

- Dashboard real content (today/upcoming/overdue/GPA summary).
- Grades & GPA page (old `adapters.js` has `computeGpa` to port).
- Calendar (month/week/agenda) + `.ics` export.
- AI assistant's brain — **backend design first**: pull the logged-in user's data as
  context server-side, key stays on backend, validate output before display.
- **Production hardening**: JWT secret → static env var (it's currently GENERATED AT
  RUNTIME and written to `.env` — breaks on hosted servers); env-driven CORS; SSL on
  cloud Postgres; rate limiting; helmet; address the npm-audit vulns in the ROOT
  `package.json` deliberately.
- **Deploy**: cloud Postgres + run migrations; host backend + built Angular; HTTPS;
  GitHub Actions CI.
- Then: delete old `frontend/`; get the backend test suite green on Postgres.
- Later: WhatsApp/Twilio reminders, refresh tokens, in-app notifications, analytics.

---

## How I like to work (important)

- Step by step, ONE change at a time. Explain WHAT we're changing and WHY before the
  code, with a short PLAIN-ENGLISH beginner summary of each step. I'm learning Angular
  - full-stack.
- READ a file before modifying it. Give EXACT file paths. When I ask, give the FULL
  file, not fragments (I sometimes paste in the wrong spot).
- **Common bug**: I paste code but forget to SAVE. If errors look identical after a fix,
  suspect an unsaved file first.
- Small meaningful commits (`feat:`/`refactor:`/`fix:`/`build:`/`chore:`). Tell me how to
  test each step; wait for it to work before moving on; debug failures before continuing.
- Ask before big architectural decisions. Simple, production-quality patterns I could
  explain in an internship interview. No `any`. Keep frontend/backend responsibilities
  separate.

---

## Test accounts (local DB)

- `test@laurier.ca` / `Test1234` → role **admin**; owns 1 course (CP476) + 2 assignments.
  Use this to see populated data.
- `admintest@laurier.ca` (name "Zohra Haidary") → a normal student.
- Public register always creates a "student"; admins are promoted manually in the DB
  (never self-selectable) — a deliberate security choice.

---

## YOUR FIRST TASK (before resuming the build)

Trackr currently looks like plain, functional Tailwind — I want it genuinely polished.
Skim this curated directory of design/AI tools + inspiration:
**https://godly.design/tools/**

Then give me concrete UI/UX direction for Trackr:

- An overall **visual direction** (typography, color system, spacing, depth/shadows, motion).
- **3–5 specific tools/resources** from that list that would actually help me.
- The **highest-impact screens to redesign first** (my guess: dashboard, course cards,
  course detail page).

KEEP the existing information architecture — improve the LOOK, don't restructure what
exists. After that, we continue with the "immediate next steps" above.

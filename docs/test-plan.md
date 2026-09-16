# Trackr — Test Plan (Milestone 3)

**Course:** CP476B – Internet Computing (Spring 2026)
**Last updated:** July 22, 2026

---

## 1. Purpose and scope

This test plan covers the end-to-end verification of Trackr, our full-stack academic management application built with a vanilla HTML/CSS/JS frontend, a Node.js/Express backend, and a MySQL database hosted on Azure. It defines the features under test, the test cases with their expected results, and the environment needed to run them. Results are recorded in the Testing Summary Report (Milestone 3 deliverable).

**In scope (we are testing):** authentication (login, signup, OAuth rejection paths), user course/activity/profile workflows, admin read endpoints, input validation (rejecting bad data), access control (JWT + role checks), and database integrity (constraints, foreign keys, cascade behaviour).

**Out of scope (we are not testing):** load and performance testing, browser compatibility beyond current Chrome/Firefox/Edge, and any features not implemented by the Milestone 3 code freeze (tracked in §9, Known limitations).

---

## 2. Test environment

| Item | Value |
|---|---|
| Backend | Node.js v24 + Express 5, `http://localhost:5000` (`cd backend && npm run dev`) |
| Test server | `http://localhost:5050`, started automatically by the test runner |
| Frontend | Static serve, `http://localhost:3000` |
| Development database | MySQL 8.x on Azure, schema `trackr_db` |
| Test database | MySQL 8.x on Azure, schema `trackr_test` — dropped and rebuilt from `db/db_init.sql` on every run |
| Tables | `users`, `courses`, `activities`, `activity_categories`, `password_reset_tokens` |
| API client | Postman (manual) / automated suite (see §10) |
| Config | `backend/.env` (development) and `backend/.env.test` (tests). Both are gitignored; `.env.test.example` is committed as a template. |

**Test accounts.** None need to be created in advance. The automated suite registers its own accounts at run time using timestamped, unique e-mail addresses, so runs are independent of each other and of leftover data. Admin accounts are created by registering a user and then promoting the row directly in the database, because `/auth/register` hard-codes the role to `student` and the API provides no way to create an administrator.

**Result key.** Pass · Fail · Partial · Skipped (blocked, reason recorded in the suite) · blank = not yet run.

---

## 3. Test cases — Authentication (`/auth`)

| ID | Test case | Steps | Expected result | Result | Notes |
|---|---|---|---|---|---|
| AUTH-01 | Register new user | POST `/auth/register` with a valid e-mail and password | 201, user created | Pass | Role is hard-coded to `student`; the client cannot choose |
| AUTH-02 | Register duplicate e-mail | POST `/auth/register` with an e-mail that already exists | 409, no duplicate row in `users` | Pass | `uq_users_email` enforced |
| AUTH-03 | Register with invalid e-mail format | POST `/auth/register` with `not-an-email` | 400, validation error, no row created | Pass | Row count checked after |
| AUTH-04 | Register with missing fields | POST `/auth/register` with an empty body | 400, validation error | Pass | |
| AUTH-05 | Login with valid credentials | POST `/auth/login` with the AUTH-01 credentials | 200, response contains a JWT and a user object with `role` | Pass | `password_hash` is not present in the response |
| AUTH-06 | Login with wrong password | POST `/auth/login` with an incorrect password | 401, generic error that does not reveal which field was wrong | Pass | |
| AUTH-07 | Login with non-existent e-mail | POST `/auth/login` with an unknown e-mail | Identical status **and body** to AUTH-06 | Pass | Bodies compared directly — prevents account enumeration |
| AUTH-08 | Forgot password, existing e-mail | POST `/auth/forgot-password` with a registered e-mail | 200 | Skipped | Blocked by KI-02. Also sends real e-mail, so excluded from the automated suite by design — verify manually |
| AUTH-08b | Forgot password, unknown e-mail | POST `/auth/forgot-password` with an unregistered e-mail | 200, same response as AUTH-08 | Skipped | Blocked by KI-02 |
| AUTH-09 | Reset password with a valid token | POST `/auth/reset-password/:token` with the token from `password_reset_tokens` + a new password | 200, old password stops working, new one works | Skipped | Blocked by KI-03. Note the token is a **URL parameter**, not a body field |
| AUTH-10 | Reset password with a bad token | POST `/auth/reset-password/fake-token` | 400, password unchanged | Skipped | Blocked by KI-03 |
| AUTH-11 | Password stored hashed | Query the `users` table after AUTH-01 | `password_hash` contains a bcrypt hash, never plaintext | Pass | Pattern checked against `/^\$2[aby]\$/` |
| AUTH-12 | OAuth register with an invalid credential | POST `/auth/register/oauth` with a garbage `credential` | 4xx, no user row created | Pass | Google SSO is implemented. A real Google ID token cannot be minted in a test environment, so only the rejection path is automated |
| AUTH-13 | OAuth login with an invalid credential | POST `/auth/login/oauth` with a garbage `credential` | 4xx, no JWT issued | Pass | |
| AUTH-14 | OAuth login with an empty body | POST `/auth/login/oauth` with `{}` | 4xx | Pass | |

---

## 4. Test cases — User workflow (`/user`, JWT required)

Everything a logged-in student can do.

### 4.1 Courses and dashboard

| ID | Test case | Steps | Expected result | Result | Notes |
|---|---|---|---|---|---|
| USER-01 | View my courses | GET `/user/courses` with a valid student token | 200, only courses belonging to the logged-in user | Pass | Isolation verified: a second student's list excludes the seeded course |
| USER-02 | View my activities | GET `/user/activities` | 200, only the user's activities | Pass | Second student's list is empty |
| USER-03 | View my statistics | Seed one activity due tomorrow and one due yesterday, both ungraded, then GET `/user/statistics` | 200, correct `total_courses`, `upcoming`, `overdue` | Pass | Counts come from `activityModel.getStatisticsByUserId` |
| USER-04 | Get a single course | GET `/user/courses/:courseId` for a course I own | 200, correct course data | Pass | |
| USER-05 | Get a course I do not own | GET `/user/courses/:courseId` for another user's course | 403/404, no data leaked | Pass | Response body checked, not only the status code |
| USER-06 | Get activities for a course | GET `/user/courses/:courseId/activities` | 200, scoped to this user and this course, ordered by due date | Pass | Sort order verified from the response, not from reading the SQL |
| USER-07 | Add a course | POST `/user/courses/` with a valid payload | 201, row created, appears in USER-01 | Pass | |
| USER-08 | Add a course with missing or invalid fields | POST `/user/courses/` with empty values | 400, no row created | Pass | Row count compared before and after |
| USER-23 | Add the same course twice | POST `/user/courses/` twice with the same code and term | Second request rejected, only one row exists | Pass | `uq_courses_user_code_term` enforced at the database level |

### 4.2 Syllabus upload

| ID | Test case | Steps | Expected result | Result | Notes |
|---|---|---|---|---|---|
| USER-09 | Upload a valid syllabus PDF | POST `/user/upload-syllabus` with a PDF in the `file` field | 200, extraction result returned | **Fail** | **KI-08** — 502, `CLAUDE_API not set in environment`. The endpoint calls an external AI service, so it cannot run in the automated suite; see §9.4 |
| USER-10a | Upload with no file | POST `/user/upload-syllabus` with an empty body | 400, "No file uploaded" | Pass | |
| USER-10b | Upload a disallowed file type | POST `/user/upload-syllabus` with a `.exe` | 4xx, graceful rejection, server still responding afterwards | Pass | A follow-up request confirms no crash |

### 4.3 Activities (assignments)

| ID | Test case | Steps | Expected result | Result | Notes |
|---|---|---|---|---|---|
| USER-14 | Add an activity | POST `/user/activities` with a valid payload | 201, appears in that course's activity list | Pass | |
| USER-15 | Add an activity with missing fields | POST `/user/activities` with an empty name and date | 400, no row created | Pass | |
| USER-16 | Add an activity to a course I do not own | POST `/user/activities` with another user's `course_id` | Rejected — must not appear on the victim's course | Pass | Cross-user write correctly blocked |
| USER-17 | Update an activity / record a grade | PUT `/user/activities/:activityId` with `grade` and `status` | 200, value persists on re-read | Pass | DECIMAL columns are returned as strings by mysql2 — compared numerically |
| USER-18 | Grade above the allowed range | PUT `/user/activities/:activityId` with `grade: 150` | Rejected, value not stored | Pass | `chk_activities_grade` allows 0–100 |
| USER-19 | Update an activity I do not own | PUT `/user/activities/:activityId` with another user's token | Victim's activity unchanged | Pass | |
| USER-20 | Delete an activity I do not own | DELETE `/user/activities/:activityId` with another user's token | Activity still present | Pass | |
| USER-21 | Delete my own activity | DELETE `/user/activities/:activityId` | 200/204, gone from the list | Pass | |
| USER-22 | Delete an activity that does not exist | DELETE `/user/activities/99999999` | 4xx, not a 500 | Pass | |

### 4.4 Profile and account

| ID | Test case | Steps | Expected result | Result | Notes |
|---|---|---|---|---|---|
| USER-11 | View my profile | GET `/user/:id/profile` with my own id and token | 200, profile returned, no `password_hash` | Pass | |
| USER-12 | Update my profile | PUT `/user/:id/profile` with one changed field | 200, change persists (verify with USER-11) | Pass | Failed on the first run with KI-01; passes after the fix |
| USER-13 | Update another user's profile | PUT `/user/:id/profile` with someone else's id | The other user's data must **not** change | Pass | Identity is taken from `req.user.user_id`, not the path parameter |
| USER-24 | Delete my account | DELETE `/user/account`, then query the database | 200/204; user row gone, and their courses and activities gone with it | Pass | FK `ON DELETE CASCADE` confirmed. Setup asserts the data existed first, so the pass is not vacuous |
| USER-25 | Token belonging to a deleted account | GET `/user/courses` with the deleted user's still-valid JWT | 4xx — the token must stop working | **Fail** | **KI-09** — returned 200. The account no longer exists but its session remains usable |

---

## 5. Test cases — Admin (`/admin`, JWT + admin role)

| ID | Test case | Steps | Expected result | Result | Notes |
|---|---|---|---|---|---|
| ADM-01 | List all users | GET `/admin/users/` with an admin token | 200, all users returned | Pass | Also asserts no `password_hash` appears in any row |
| ADM-02 | Get a single user | GET `/admin/users/:id` | 200, correct user | Pass | |
| ADM-03 | List all courses | GET `/admin/courses/` | 200, all courses | Pass | |
| ADM-04 | Get a single course | GET `/admin/courses/:id` | 200, correct course | Pass | |
| ADM-05 | Global statistics | GET `/admin/statistics/` | 200, aggregate statistics | Pass | |
| ADM-06 | All user activities | GET `/admin/user-activities/` | 200, activities across users | Pass | |
| ADM-07 | Unknown user id | GET `/admin/users/99999999` | 4xx, not a 500 | Pass | Missing records handled, not crashed on |
| ADM-08 | Recent activity feed | GET `/admin/recent-activity/` with an admin token | 200 | Pass | |
| ADM-09 | Recent activity with a student token | GET `/admin/recent-activity/` as a student | 403 | Pass | |
| ADM-10 | Recent activity with no token | GET `/admin/recent-activity/` anonymously | 401 | Pass | |

### 5.1 Access control and input safety

| ID | Test case | Steps | Expected result | Result | Notes |
|---|---|---|---|---|---|
| SEC-01 | No token on a protected route | GET `/user/courses` with no Authorization header | 401 | Pass | |
| SEC-02 | Malformed token | GET `/user/courses` with `Bearer abc123` | 401 | **Fail** | **KI-04** — returns 403 |
| SEC-03 | Expired token | GET `/user/courses` with an expired but validly signed JWT | 401 | **Fail** | KI-04 — returns 403. Access is correctly denied; only the status code is wrong |
| SEC-04 | Student token on an admin route | GET `/admin/users/` with a student token | 403, blocked by `requireAdmin` | Pass | |
| SEC-05a | SQL injection at login | POST `/auth/login` with `' OR '1'='1` | No bypass, no token issued, `users` table intact | Pass | Read path |
| SEC-05b | SQL injection through a write path | Add a course named `'; DROP TABLE users;--` | Stored verbatim as text, schema intact | Pass | Write path — confirms parameterised queries on INSERT |
| SEC-06 | XSS payload stored safely | Add a course named `<script>alert(1)</script>` | Returned as an inert JSON string | Pass | Browser-side rendering is covered manually by UI-15 |
| SEC-07 | CORS with an unexpected origin | Send a request with an arbitrary `Origin` header | The arbitrary origin is not reflected back | Pass | |
| SEC-08 | Admin routes with no credential | GET `/admin/users/`, `/admin/courses/`, `/admin/statistics/` anonymously | 401 on all three | Pass | Distinct from SEC-04, which covers the wrong role |

---

## 6. Test cases — Frontend UI (manual)

These sixteen cases require a browser and are executed by hand. Automating them would need an external framework such as Playwright or Selenium, which is outside the tooling permitted for this course without prior approval.

| ID | Test case | Steps | Expected result | Result | Notes |
|---|---|---|---|---|---|
| UI-01 | Signup form client-side validation | Submit signup with an invalid e-mail and a weak password | Inline errors from `validation.js` and the password checklist; no submit | Pass | Client-side only — see KI-07 |
| UI-02 | Login → dashboard flow | Log in through the UI with a valid account | Redirect to the dashboard; courses and activities render | | |
| UI-03 | Role-based redirect | Log in as an admin | Redirected to the admin dashboard | | |
| UI-04 | Primary workflow end to end | Signup → login → add course → view course → view activities → update profile | Every step succeeds against the real backend, not mocks | | |
| UI-05 | Navigation between pages | Click through all nav links and partials | All pages load via `include.js`; no broken links or console errors | Pass | |
| UI-06 | Graceful API failure | Stop the backend, then use the UI | User-friendly error; no white screen or unhandled exception | | |
| UI-07 | Dashboard shows real data | Log in as a seeded student and view the dashboard | Counts and lists match the database, not `mock-data.js` (no "Alex Chen" leftovers) | | Widgets with no backend source are listed in §9.3 |
| UI-08 | Student settings persist | Change theme and GPA scale, save, reload | Values persist; `users` row updated | | |
| UI-09 | Admin settings profile | Log in as any admin and open Settings → Profile | The logged-in administrator's details load | **Fail** | **KI-06** — shows hard-coded "Sarah Johnson / ADM-001 / admin@trackr.ca" for every admin. Confirmed with a second account; the sidebar shows the correct name |
| UI-10 | Admin settings save | Click Save Changes with the browser network tab open | A request is sent and succeeds | | If no request fires, the page is display-only |
| UI-11 | Admin password change | Enter a new password, update, log out, log back in | The new password works | | Highest-risk case: a field that silently does nothing is worse than no field at all |
| UI-12 | Admin settings toggles | Toggle the notification switches, reload | State persists | | No columns exist for these — expected to fail |
| UI-13 | Delete an assignment through the UI | Delete an assignment, then reload | Removed and does not reappear | | Backend path already verified by USER-21 |
| UI-14 | Responsive layout | Desktop 1920 px, tablet 768 px, mobile 375 px | Usable at each width, no horizontal overflow | Partial | Desktop passes; tablet and mobile not yet checked |
| UI-15 | XSS renders as text | View the course created in SEC-06 in the browser | Rendered as visible text; no alert fires | | Completes the browser half of SEC-06 |
| UI-16 | Syllabus upload end to end | Upload a real syllabus PDF through the UI | Extraction returns fields for review | | Covers what USER-09 cannot — see KI-08 |

---

## 7. Results summary

Final automated run: **July 22, 2026**. Raw output is committed as `backend/test-results.tap`.

| Measure | Count |
|---|---|
| Total cases in this plan | 76 |
| Automated | 60 |
| Manual (browser required) | 16 |
| **Automated: passed** | **52** |
| Automated: failed | 4 |
| Automated: skipped (blocked, documented) | 4 |
| Pass rate of executed automated cases | 93 % |

| Area | Executed | Passed | Failed |
|---|---|---|---|
| Authentication | 11 | 11 | 0 |
| Student workflow | 26 | 24 | 2 |
| Admin endpoints | 10 | 10 | 0 |
| Access control and input safety | 9 | 7 | 2 |

**The four failures.** Two are the same defect (KI-04, an incorrect status code that still denies access correctly). One is a genuine security gap found by a case that did not exist in the original plan (KI-09, a session surviving account deletion). One is an environment limitation rather than a code fault (KI-08, the syllabus endpoint requires an external AI service key).

**Progress across runs.** The first run passed 33 of 42. Two defects found then — KI-01, a 500 on partial profile updates, and KI-05, the JWT signing secret printed to standard output — have since been fixed and both now pass. Coverage grew from 42 to 60 automated cases after route inspection revealed four untested endpoint groups.

**No failure indicates a data-isolation or authentication bypass.** Every case testing whether one user can reach another user's data — USER-05, USER-13, USER-16, USER-19, USER-20, SEC-01, SEC-04, SEC-08 — passed.

---

## 8. Traceability — user stories to test cases

Maps the Milestone 1 user stories to the test cases that verify them.

| Story | Feature | Verified by | Coverage notes |
|---|---|---|---|
| US-01 Authentication | Register / login with role | AUTH-01–07, AUTH-11–14, UI-01, UI-02, UI-03 | Google SSO routes exist (`/auth/register/oauth`, `/auth/login/oauth`); only the rejection paths are automated. Role selection at signup is ignored by the backend. Weak-password check is client-side only |
| US-02 Syllabus upload + AI extraction | Upload PDF, extract fields | USER-09, USER-10a, USER-10b, UI-16 | Extraction **is** implemented and calls an external AI service. It cannot be exercised automatically without a live API key (KI-08), so it is verified manually |
| US-03 Extraction review & confirm | Edit / confirm parsed fields | — | `extraction-review.html` exists but has no backend endpoints for saving reviewed fields (§9.3) |
| US-04 Semester dashboard | Courses, statistics, weekly glance | USER-01, USER-02, USER-03, UI-04, UI-07 | Study hours, streak, and GPA delta widgets are mock-only (§9.3) |
| US-05 Course view | Syllabus details, sorted assignments, grade breakdown | USER-04, USER-06 | Due-date ordering verified from the API response |
| US-06 Assignment details | Name, type, due date, weight, status, grade | USER-06, USER-14, USER-17 | `status` is a stored ENUM column in `activities`, not derived |
| US-07 GPA calculator | Scales, current GPA, target calculation | USER-03, USER-17 (partial) | GPA arithmetic is frontend-only; the backend stores raw grades |
| US-08 Reminders | E-mail / WhatsApp deadline reminders | — | Reminder columns exist in the schema, but no scheduling or delivery is implemented (§9.3) |
| US-09 Calendar monthly | Deadlines across courses | USER-02, UI-04 | Calendar rendering is frontend; data source is `/user/activities` |
| US-10 Calendar weekly | Next-7-days view, priorities | USER-02, UI-04 | `priority_level` is a stored ENUM column with a default of `medium` |
| US-11 Settings / profile | Edit profile and preferences | USER-11, USER-12, USER-13, USER-24, UI-08 | Full coverage after the KI-01 fix |
| US-12 Admin dashboard | Metrics, user and course management | ADM-01–10, SEC-04, SEC-08, UI-09–UI-12 | Admin API is read-only; archive, reset-password, and disable-account have no endpoints (§9.3) |

---

## 9. Known limitations and defects

### 9.1 Defects found

| ID | Severity | Description | Found by | Status |
|---|---|---|---|---|
| KI-01 | High | `PUT /user/:id/profile` returned 500 on a partial update. The controller read every profile column from the request body, so omitted fields were written as NULL and rejected by the `NOT NULL` constraint on `first_name`. | USER-12 | **Fixed** — verified July 22 |
| KI-05 | Medium | `server.js` printed the full `JWT_SECRET` to standard output on every start-up, exposing the key that signs every session token to anyone with terminal or log access. | Server start-up output | **Fixed** — verified July 22 |
| KI-09 | **High** | A JWT belonging to a deleted account continues to work. After `DELETE /user/account` removes the user row, the token still returns 200 on protected routes until it expires naturally. `verifyToken` trusts the token signature without confirming the user still exists. | USER-25 | Open |
| KI-04 | Low | `verifyToken` returns 403 when `jwt.verify()` throws. A malformed or expired credential should return 401; 403 belongs to role failures. Access is correctly denied either way — only the status code is misleading. | SEC-02, SEC-03 | Open |
| KI-06 | Medium | The admin settings Profile section is hard-coded to placeholder values and does not load the logged-in administrator. | UI-09 | Open |
| KI-08 | Environment | `POST /user/upload-syllabus` returns 502 when `CLAUDE_API` is not set. The endpoint is not a stub: it sends the uploaded PDF to an external AI service for extraction, so it cannot be exercised by the automated suite. | USER-09 | Documented — see §9.4 |

### 9.2 Blocked test cases

- **KI-02 — Forgot password has no error handling.** `POST /auth/forgot-password` has no try/catch, so a database error leaves the request open with no response at all instead of returning a 500. AUTH-08 and AUTH-08b are written and skipped with this reason recorded in the suite.
- **KI-03 — `password_reset_tokens` is missing from the schema file.** The table exists in `trackr_db` but was never added to `db/db_init.sql`. Because the test database is rebuilt from that file, the table does not exist there, which is what caused KI-02 to surface. A fresh clone of the repository therefore gets a broken forgot-password flow. AUTH-09 and AUTH-10 are written and skipped.

### 9.3 Unimplemented features

- **Courses have no update or delete.** There is no `PUT /user/courses/:courseId` and no `DELETE /user/courses/:courseId`. Courses support create and read only; once added, a course cannot be edited or removed. Activities have full CRUD (USER-14, USER-17, USER-21).
- **KI-07 — Password strength is enforced in the browser only.** `validation.js` applies the password checklist client-side; the backend accepts any non-empty password, so a direct API call bypasses the check. This does not meet the US-01 acceptance criterion.
- **Role selection at signup.** `/auth/register` hard-codes the role to `student`. The signup screen offers a Student/Admin choice that the backend ignores; admin accounts must be promoted directly in the database.
- **Extraction review flow (US-03).** `extraction-review.html` exists but has no backend endpoints for saving reviewed fields.
- **Reminders (US-08).** Reminder columns exist in the schema, but no scheduling, e-mail, or WhatsApp delivery is implemented.
- **Admin write actions (US-12).** Admin routes are read-only. Archive course, reset password, and disable account have no endpoints.
- **Admin settings fields without storage.** Administrator ID, Department, Language, Default Dashboard, Items Per Page, Time Zone, two-factor authentication, and the three notification toggles have no corresponding columns in the `users` table and therefore cannot persist.
- **Dashboard widgets without a data source.** Study hours, study streak, GPA delta, and course percent-complete are hard-coded in `mock-data.js`; the schema does not store this data.

### 9.4 Testing limitations

- **Syllabus extraction cannot be automated.** The endpoint calls an external AI service, which requires a live API key and consumes quota on every invocation. Running it on each test run would be slow, costly, and dependent on a third party being reachable. USER-09 therefore records the failure honestly rather than masking it, and the feature is verified manually through the UI instead (UI-16).
- **Forgot-password sends genuine e-mail** through `nodemailer`, so AUTH-08 is deliberately excluded from the automated suite for the same reason and verified manually.
- **Intermittent database timeouts.** One test run failed part-way through with repeated `connect ETIMEDOUT` errors against the Azure database. `src/config/db.js` sets `connectTimeout: 2000`, which is tight for a remote connection and could produce the same intermittent failures for real users, not only for tests.
- **Google SSO happy path is untested.** A valid Google ID token cannot be minted in a test environment, so AUTH-12 to AUTH-14 cover the rejection paths only.
- No load or performance testing was carried out.
- Browser testing was limited to current Chrome, Firefox, and Edge.
- Cross-site scripting was verified at the API layer, where the payload is stored and returned as an inert JSON string. Whether the browser executes it depends on the rendering layer, covered manually by UI-15.
- Automated coverage stops at the HTTP boundary; frontend JavaScript has no unit tests.

---

## 10. Running the automated suite

From a clean clone of the repository:

```bash
cd backend
npm install

cp .env.test.example .env.test
# edit .env.test and fill in your MySQL credentials
# DB_NAME must end in "_test" or the runner refuses to start

npm test
```

A single command performs the whole cycle: it drops and recreates the `trackr_test` database from `db/db_init.sql`, starts the server on port 5050 against that database, runs every test file in sequence, then shuts the server down.

**Output.** Human-readable results print to the terminal; a machine-readable copy is written to `backend/test-results.tap`.

**Safety.** Both the runner and the test harness refuse to start unless `DB_NAME` ends in `_test`, because the runner issues `DROP DATABASE` against whatever database it is pointed at. The development database cannot be affected.

**Requirements.** Node.js 20 or newer. The suite uses the built-in `node:test` runner, global `fetch`, and global `FormData`. No external test framework is used — only `mysql2`, `jsonwebtoken`, and `dotenv`, all of which the project already depends on.

**Test files**

| File | Covers |
|---|---|
| `tests/run-tests.js` | Orchestration: database reset, server start-up, test execution, shutdown |
| `tests/helpers/harness.js` | Shared HTTP client, database access, account creation, seed data |
| `tests/auth.test.js` | AUTH-01 – AUTH-11 |
| `tests/user.test.js` | USER-01 – USER-13 |
| `tests/admin.test.js` | ADM-01 – ADM-07 |
| `tests/security.test.js` | SEC-01 – SEC-08 |
| `tests/coverage.test.js` | USER-14 – USER-25, AUTH-12 – AUTH-14, ADM-08 – ADM-10 |

**Design notes**

- Tests run with `--test-concurrency=1` because they share one database.
- Each test creates the data it needs rather than depending on a fixed fixture, so cases can be run in any order and a re-run does not collide with the previous one.
- Cross-user access cases assert the security property — the victim's data is unchanged — rather than a specific status code, so a correctly secured backend cannot fail them on a technicality.
- The database is reset per run so that duplicate-email and count-based assertions stay deterministic.
- Blocked cases are declared and skipped with a stated reason rather than omitted, so the run output and this document agree on what is and is not covered.
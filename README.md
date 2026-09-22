# Trackr

> **AI-powered academic planning, grade intelligence, and workload management for students.**

Trackr is a full-stack student productivity platform designed to turn course information, deadlines, grades, and workload into a clear academic plan.

Instead of forcing students to rebuild their semester manually across multiple apps, Trackr is being built around one simple idea:

> **Upload your courses once. Trackr turns them into an academic plan and tells you what needs your attention next.**

---

## Table of Contents

* [Overview](#overview)
* [Why Trackr](#why-trackr)
* [Product Vision](#product-vision)
* [Current Features](#current-features)
* [Planned Features](#planned-features)
* [AI Architecture](#ai-architecture)
* [Technology Stack](#technology-stack)
* [Architecture](#architecture)
* [Project Structure](#project-structure)
* [Security](#security)
* [Getting Started](#getting-started)
* [Environment Variables](#environment-variables)
* [Testing](#testing)
* [Deployment](#deployment)
* [Roadmap](#roadmap)
* [Design Direction](#design-direction)
* [Project Status](#project-status)
* [Author](#author)
* [License](#license)

---

# Overview

Students often manage academic work across several disconnected tools:

* course portals
* syllabi
* calendars
* spreadsheets
* GPA calculators
* reminder apps
* task managers
* notes

Trackr aims to bring the most important parts of that workflow into one student-focused system.

The long-term Trackr workflow is:

```text
Syllabus / Course Information
            ↓
      AI Extraction
            ↓
 Courses + Assessments
            ↓
 Deadlines + Weights + Grades
            ↓
    Grade Intelligence
            ↓
   Workload Intelligence
            ↓
 Personalized Study Plan
            ↓
      Next Best Action
```

The goal is not to become another generic student dashboard.

Trackr is being built to answer a more useful question:

> **What should I work on next, and how does it affect my semester?**

---

# Why Trackr

Most academic tools are good at storing information.

Trackr is being designed to help students **understand and act on that information**.

For example:

```text
CP470 — Android Assignment 2

Due tomorrow
20% of course
Estimated work remaining: 1h 45m
Priority: High

Recommended:
Work on this next.
```

Trackr will eventually consider signals such as:

* due date
* assignment weight
* current course grade
* target grade
* estimated effort
* completed effort
* remaining workload
* user priority
* exam proximity
* course risk
* calendar availability

---

# Product Vision

Trackr began as a university team project and is now being independently redesigned into a modern, production-focused full-stack application.

The new Trackr experience is being organized around five primary areas:

```text
TODAY
PLANNER
COURSES
CALENDAR
GRADES
```

Supporting features include:

```text
Search
Ask Trackr
Notifications
Profile
Settings
Help
```

Trackr is currently focused on the **student experience first**.

Teacher dashboards, classrooms, join codes, and larger institution features are considered future expansion areas rather than core v1 functionality.

---

# Current Features

> **Important:** Trackr is actively being modernized. Some functionality is still being migrated from the original frontend into the Angular application.

## Authentication

* User registration
* User login
* JWT-based authentication
* Protected routes
* Password hashing
* User-scoped data
* Password-reset infrastructure

---

## Course Management

* Create courses manually
* View active courses
* Store course information
* View course details
* Associate assignments with courses
* Track course progress
* Archive/delete course workflows
* Store grade-related course information

---

## AI Syllabus Processing

Trackr can use AI to convert syllabus information into structured academic data.

The intended workflow is:

```text
Upload syllabus
      ↓
Extract course information
      ↓
Extract assessments
      ↓
Extract weights
      ↓
Extract due dates
      ↓
Review extracted information
      ↓
Create course
```

This reduces the repetitive setup students usually perform at the beginning of every semester.

---

## Assignment & Activity Tracking

Trackr supports the foundation for tracking:

* assignment title
* associated course
* due date
* weight
* completion status
* grade
* estimated work
* academic activities

---

## Grades

Trackr currently includes foundations for:

* weighted grades
* course performance
* GPA calculations
* grade progress
* academic statistics

---

## Dashboard

The existing application includes dashboard information such as:

* active courses
* upcoming assignments
* deadlines
* GPA/statistics
* progress
* academic overview

The dashboard is being redesigned into the more action-oriented **Today / Next Move** experience.

---

## Calendar

Trackr includes academic calendar concepts such as:

* deadlines
* academic events
* weekly views
* monthly views

The production version will expand this into a complete planning system.

---

## Profile & Settings

Current/profile-related functionality includes:

* account information
* student information
* academic statistics
* preferences
* settings concepts

Important settings will eventually be stored server-side so they follow the student across devices.

---

# Planned Features

The following features represent the planned production direction for Trackr.

They are separated from current functionality so unfinished features are not presented as already implemented.

---

# 1. Today / Next Move

The future Trackr home screen.

Instead of displaying a collection of unrelated statistics, Trackr will identify the student's most important next actions.

Example:

```text
Good afternoon

Tuesday, September 22

YOUR NEXT MOVE

CP470 — Android Assignment 2
Due tomorrow · 20% · ~1h 45m remaining

[ Start Focus Session ]

COMING UP

1. CP414 Quiz
   Friday · 10%

2. CP468 Project
   7 days · 35%

3. Review CP470 Chapter 6
   Estimated: 45 min
```

Trackr can eventually prioritize tasks using:

* due date
* assignment weight
* estimated duration
* remaining work
* task progress
* user priority
* current grade
* target grade
* course risk
* exam proximity

---

# 2. Smart Planner

The Smart Planner will connect academic work to actual available time.

Planned features:

* daily planning
* weekly planning
* workload overview
* study blocks
* drag-and-drop scheduling
* unscheduled task queue
* task duration estimates
* remaining-work calculations
* automatic workload distribution
* conflict detection
* overdue-work recovery planning
* suggested study periods

Example:

```text
Assignment remaining work: 3.5 hours

Suggested Schedule

Tuesday      7:00 PM – 8:00 PM
Wednesday    2:00 PM – 3:30 PM
Thursday     6:00 PM – 7:00 PM
```

---

# 3. Estimated Effort & Workload Tracking

Assignments should represent more than just deadlines.

Planned workload fields:

```text
Estimated effort: 4h
Completed:        1.5h
Remaining:        2.5h
```

Trackr will use this information for:

* planning
* priority ranking
* workload forecasting
* study scheduling
* deadline-risk detection

---

# 4. Improved Assignment Management

Planned assignment features include:

* priority
* estimated duration
* completed duration
* remaining duration
* subtasks
* checklists
* recurrence
* labels
* notes
* resources
* status
* progress
* quick edit
* duplicate assignment
* search
* sorting
* countdown to deadline
* assignment history

Planned filters include:

```text
Course
Due Date
Status
Priority
Weight
Completion
Overdue
Upcoming
Assessment Type
```

---

# 5. Natural-Language Quick Add

Students should be able to create assignments without filling out large forms.

Example input:

```text
CP470 lab Friday 11:59 PM worth 5% about 2 hours
```

Trackr could interpret it as:

```text
Course: CP470
Type: Lab
Due: Friday at 11:59 PM
Weight: 5%
Estimated effort: 2 hours
```

Quick Add is planned to be globally available throughout Trackr.

---

# 6. Course Workspace Redesign

Each course will become its own academic workspace.

Planned tabs:

```text
Overview | Work | Grades | Files | Course Info
```

## Overview

Planned information:

* current grade
* target grade
* remaining course weight
* next assessment
* upcoming deadlines
* course progress
* grade outlook
* course risk
* upcoming study sessions

Example:

```text
CP470
Android Programming

Current Grade       82.4%
Target Grade        85%
Remaining Weight    38%
```

---

## Work

Students will be able to manage:

* assignments
* labs
* quizzes
* projects
* exams
* study tasks
* workload
* filters
* completion status

---

## Grades

Planned functionality:

* weighted grade breakdown
* completed-weight grade
* remaining weight
* target calculator
* what-if calculations
* assessment categories
* GPA impact

---

## Files

Planned course file support:

* syllabus
* rubrics
* readings
* lecture materials
* notes
* extracted text
* AI-searchable course documents

---

## Course Info

Planned fields:

* course code
* course name
* instructor
* semester
* credits
* grading scale
* class schedule
* classroom/location
* office hours
* important links

---

# 7. Grade Intelligence

Trackr is being redesigned around one authoritative grade-calculation engine.

Planned functions include:

```text
calculateCourseGrade()
calculateWeightedCompletedGrade()
calculateRemainingWeight()
calculateTargetNeeded()
calculateGPA()
percentageToGPA()
```

Planned grade functionality:

* current course grade
* completed-weight grade
* remaining course weight
* target grade
* required remaining average
* what-if calculator
* course credits
* weighted GPA
* configurable GPA scales
* percentage-to-GPA conversion
* course-specific grading schemes
* category weighting
* dropped assessments
* bonus grades
* pass/fail support
* GPA trends
* grade history

Example:

```text
Current Grade:              82.4%
Target Grade:               85%
Remaining Course Weight:    38%

Required Average on
Remaining Assessments:      89.2%
```

---

# 8. Exam & Revision Planner

Exams should become planning objects rather than simple calendar dates.

Example:

```text
Final Exam
December 14

12 chapters
18 study days remaining

Study Plan

Nov 24 — Chapter 1
Nov 26 — Chapter 2
Nov 28 — Chapter 3

...

Dec 11 — Practice exam
Dec 13 — Light review
```

Planned features:

* exam date
* chapters/topics
* confidence level
* estimated revision time
* automatic revision schedule
* spaced review
* practice exam scheduling
* progress tracking
* missed-session rescheduling

---

# 9. Calendar Improvements

Planned calendar functionality:

* month view
* week view
* day view
* assignment deadlines
* exams
* recurring classes
* study blocks
* personal events
* drag-and-drop rescheduling
* course color coding
* filters
* recurring academic events
* timezone-aware timestamps

Trackr should eventually combine:

```text
Academic Deadlines
+
Class Schedule
+
Study Sessions
+
Personal Calendar
```

---

# 10. Google Calendar Integration

Google Calendar is planned as the first external calendar integration.

Goals:

* display calendar events inside Trackr
* push Trackr study blocks to Google Calendar
* synchronize academic events
* prevent double-booking
* use actual availability when creating study plans

Possible future integrations:

* Outlook Calendar
* Apple Calendar
* iCal / ICS

---

# 11. Notifications & Reminders

Planned notification functionality:

* in-app notification center
* read/unread state
* due-date reminders
* overdue reminders
* upcoming exam reminders
* study-session reminders
* grade alerts
* syllabus-import alerts
* schedule-change alerts

Potential notification methods:

* in-app
* email
* browser push

Students will eventually be able to configure their reminder preferences.

---

# 12. Ask Trackr — Academic AI Assistant

Trackr's AI assistant will be contextual rather than simply being a standalone chatbot.

## From Today

Students could ask:

```text
What should I work on first?

Can I finish everything this week?

What is currently at risk?
```

## From a Course

```text
What do I need on my final to get an 85?

Which assessment is worth the most?

What work is still incomplete?
```

## From Grades

```text
Which courses need more attention?

How would getting 90% on Assignment 3 affect my grade?
```

## From Course Documents

```text
What is the late policy?

What chapters are on the midterm?

What does the syllabus say about attendance?
```

---

# 13. AI Source Citations

When Trackr answers questions using uploaded documents, responses should show where the information came from.

Example:

```text
Late assignments receive a 10% deduction per day.

Source:
CP470 Syllabus · Page 6
```

This will make AI responses easier to verify and more trustworthy.

---

# 14. Hybrid AI Architecture

Trackr's long-term AI design uses two different approaches depending on the question.

## Structured Academic Data

Questions involving deadlines, grades, assignments, schedules, and workloads should use structured application data.

```text
Student Question
       ↓
Intent / Tool Selection
       ↓
Safe Application Service
       ↓
PostgreSQL
       ↓
Structured Result
       ↓
LLM Explanation
```

Examples:

```text
What is due this week?

What is my current grade?

What do I need on my final?

Which assignment should I prioritize?
```

---

## Course Documents

Unstructured information will use document retrieval.

```text
Syllabus
Lecture Notes
Readings
Rubrics
       ↓
Chunk + Embed
       ↓
Retrieve Relevant Content
       ↓
LLM Answer
       ↓
Source Citation
```

The planned architecture is therefore:

```text
Structured Academic Tools
          +
Document Retrieval
          +
Source Citations
```

---

# 15. Search & Command Bar

Trackr will eventually include a global search/command interface.

Example:

```text
⌘ K — Search or Ask Trackr
```

Searchable content:

* courses
* assignments
* exams
* calendar events
* settings
* course documents

Possible commands:

```text
Add Assignment

Add Course

Open Planner

Ask Trackr

Calculate Target Grade

Start Focus Session
```

---

# 16. Focus Sessions

Planned focus functionality:

* start focus session from an assignment
* timer
* pause/resume
* study-time tracking
* progress tracking
* associate study time with a course
* associate study time with an assignment
* compare estimated vs actual effort

This information can later improve workload estimates.

---

# 17. Academic Term Management

Trackr will support the full academic semester lifecycle.

Planned functionality:

* semesters/terms
* active semester
* previous semesters
* archived courses
* restore course
* course history
* semester GPA
* cumulative GPA
* academic trends

Completed semesters should remain accessible without cluttering the current workspace.

---

# 18. Course Credits & GPA Systems

Planned support:

* course credits
* credit-weighted GPA
* percentage grades
* 4.0 GPA
* 12.0 GPA
* custom institutional GPA scales
* configurable grading scales
* pass/fail courses

---

# 19. Flexible / TBD Due Dates

Not every assignment has a confirmed due date.

Trackr will support:

```text
Research Paper

Due Date: TBD
```

Students should never be required to enter fake dates simply to save academic work.

---

# 20. Mobile Experience

Trackr will be designed as a true mobile experience rather than a smaller version of the desktop interface.

Planned mobile navigation:

```text
Today | Planner | + | Courses | Calendar
```

Mobile priorities:

* bottom navigation
* large touch targets
* quick add
* swipe actions
* compact assignment cards
* fast grade entry
* deadline visibility
* notifications
* responsive calendar
* fast Today view

---

# 21. Progressive Web App / Offline Support

Potential PWA functionality:

* installable web application
* app-like mobile launch
* cached application shell
* basic offline access
* offline assignment viewing
* synchronization after reconnecting

---

# 22. Accessibility

Trackr will target strong accessibility practices.

Planned areas include:

* semantic HTML
* keyboard navigation
* visible focus states
* sufficient contrast
* screen-reader labels
* accessible forms
* understandable error messages
* reduced-motion support
* responsive text
* large touch targets

---

# 23. Data Export

Students should be able to take their data with them.

Planned export functionality:

* courses
* assignments
* grades
* calendar information
* academic history

Possible formats:

```text
CSV
JSON
ICS
```

---

# 24. Account & Privacy Controls

Planned production account functionality:

* change password
* security settings
* notification preferences
* session management
* export user data
* delete account
* privacy controls
* data-retention controls

---

# 25. Instructor / Classroom Features

Instructor functionality is considered a later expansion area.

Possible future features:

* instructor accounts
* course publishing
* join codes
* classroom enrollment
* instructor-created assignments
* announcements
* shared resources

These features will not be prioritized until the core student workflow is reliable.

---

# AI Architecture

Trackr currently uses AI primarily around syllabus extraction.

The production architecture will avoid giving the LLM unrestricted database access.

Instead:

```text
Angular Client
      ↓
Express API
      ↓
Application Services
      ↓
Validated Academic Tools
      ↓
PostgreSQL
```

The AI layer should only call controlled application functions.

Examples:

```text
getUpcomingAssignments()

getCourseGrade()

calculateTargetGrade()

getAvailableStudyTime()

getCourseSchedule()

getAssessmentBreakdown()
```

Document-aware AI will only retrieve approved user-owned course material.

---

# Technology Stack

## Frontend

* Angular
* TypeScript
* Tailwind CSS
* Angular Router
* Angular services
* Route guards
* HTTP interceptors
* Responsive component architecture

---

## Backend

* Node.js
* Express.js
* REST API
* JavaScript / TypeScript migration
* Authentication services
* Application/service architecture
* Server-side validation

---

## Database

Trackr's modernization target is:

```text
PostgreSQL
```

The original project used MySQL and is being migrated toward one PostgreSQL-based data layer.

---

## AI

* Anthropic Claude API
* structured syllabus extraction
* future academic tool calling
* future document retrieval/RAG
* source-aware responses

---

# Architecture

```text
┌──────────────────────────────┐
│        Angular Client        │
│                              │
│ Today                        │
│ Planner                      │
│ Courses                      │
│ Calendar                     │
│ Grades                       │
└──────────────┬───────────────┘
               │
             HTTPS
               │
               ▼
┌──────────────────────────────┐
│         Express API          │
│                              │
│ Routes                       │
│ Controllers                  │
│ Authentication               │
│ Authorization                │
│ Validation                   │
│ Services                     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│         PostgreSQL           │
│                              │
│ Users                        │
│ Courses                      │
│ Assessments                  │
│ Grades                       │
│ Calendar Events              │
│ Preferences                  │
└──────────────────────────────┘

               +

┌──────────────────────────────┐
│           AI Layer           │
│                              │
│ Syllabus Extraction          │
│ Academic Tools               │
│ Document Retrieval           │
│ Source Citations             │
└──────────────────────────────┘
```

---

# Project Structure

Trackr is being modernized toward a structure similar to:

```text
Trackr/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── environments/
│   │   └── ...
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── ...
│   └── package.json
│
├── database/
│   └── migrations/
│
├── docs/
│
├── tests/
│
├── .github/
│   └── workflows/
│
├── README.md
└── ...
```

The exact structure may evolve during development.

---

# Security

Trackr handles private academic information, accounts, uploaded files, and AI requests.

Security is therefore part of the application's architecture.

---

## Authentication & Authorization

Production goals:

* server-controlled roles
* secure password hashing
* protected API routes
* object-level ownership checks
* stable environment-managed secrets
* authorization testing
* prevention of cross-user data access

---

## Login Protection

Planned security controls:

* login rate limiting
* repeated-attempt protection
* password-reset rate limits
* AI request limits
* upload limits

---

## Password Reset

Production reset flow:

```text
Random token
     ↓
Short expiration
     ↓
Hashed database storage
     ↓
Single use
     ↓
Invalidated after reset
```

Reset tokens must never be logged.

Responses should not reveal whether an email exists.

---

## Server-Side Validation

Trackr will validate important data on the backend.

Examples:

```text
Emails
IDs
Grades
Weights
Credits
Dates
Course Information
Reminder Times
AI Input Length
File Metadata
Request Body Size
```

Angular validation is treated as a user-experience layer, not as a security boundary.

---

## File Upload Security

Syllabus/document uploads should enforce:

* PDF allowlisting
* upload size limits
* MIME validation
* file signature verification
* generated storage filenames
* parser limits
* parser timeouts
* temporary-file cleanup
* storage outside public web directories

---

## Browser Security

Production configuration should include:

* restricted CORS origins
* HTTPS
* security headers
* secure authentication strategy
* CSRF protection where required

---

## Data Protection

Planned production protections:

* database backups
* restore testing
* least-privilege infrastructure
* secure secret management
* safe production logging
* account deletion
* data export
* defined data-retention policy

---

# Getting Started

> Trackr is currently under active development. Setup instructions may change during the Angular and PostgreSQL migration.

## Prerequisites

Install:

* Node.js
* npm
* PostgreSQL
* Angular CLI

Install Angular CLI:

```bash
npm install -g @angular/cli
```

Clone Trackr:

```bash
git clone https://github.com/HZohra/Trackr.git
cd Trackr
```

---

# Backend Setup

Move into the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create your environment configuration.

Start the backend using the script defined in `backend/package.json`.

Example:

```bash
npm run dev
```

---

# Frontend Setup

Move into the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start Angular:

```bash
ng serve
```

The application will normally be available locally at:

```text
http://localhost:4200
```

The Angular development environment should point to the local backend.

Example:

```ts
export const environment = {
  production: false,
  apiBase: 'http://localhost:5000'
};
```

Production should use the deployed API URL instead.

---

# Environment Variables

Exact variable names should match the backend implementation.

A production environment may require values such as:

```env
NODE_ENV=
PORT=

DATABASE_URL=

JWT_SECRET=

ANTHROPIC_API_KEY=

FRONTEND_URL=

EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=
```

Additional variables may be introduced as new features are implemented.

> Never commit production API keys, secrets, passwords, reset tokens, or database credentials to Git.

---

# Testing

Trackr is moving toward automated testing as part of production readiness.

---

## Backend Tests

Planned coverage:

* authentication
* authorization
* cross-user access prevention
* course CRUD
* assignment CRUD
* syllabus import
* grade calculations
* GPA calculations
* password reset
* timezone handling
* validation
* upload security

---

## Frontend Tests

Planned coverage:

* Angular services
* route guards
* forms
* state handling
* loading states
* error states
* important user workflows

---

## Grade Engine Tests

Critical grade functions should have dedicated unit tests.

Examples:

* weighted averages
* remaining weight
* target-grade calculations
* credit-weighted GPA
* GPA conversion
* missing grades
* invalid weights
* bonus assessments

---

# Continuous Integration

Planned GitHub Actions workflow:

```text
Install
  ↓
Lint
  ↓
Test
  ↓
Type Check
  ↓
Angular Build
  ↓
Backend Validation
  ↓
Dependency / Security Checks
```

---

# Deployment

The intended Trackr production architecture separates each application layer.

```text
Angular Frontend
       ↓
      HTTPS
       ↓
Express REST API
       ↓
PostgreSQL Database
```

The Angular frontend does **not** connect directly to PostgreSQL.

All data access passes through the backend API.

Production deployment will also require:

* production environment variables
* HTTPS
* managed PostgreSQL
* restricted CORS
* database backups
* error monitoring
* structured logging
* health checks
* transactional email
* rate limiting
* secure file handling

---

# Roadmap

Trackr's roadmap follows one principle:

> **Reliability before expansion.**

---

## Phase 0 — Security Blockers

* [ ] Remove public privilege/role escalation paths
* [ ] Harden password reset
* [ ] Secure JWT secrets
* [ ] Add login rate limiting
* [ ] Add password-reset rate limiting
* [ ] Add AI endpoint limits
* [ ] Add upload limits
* [ ] Verify object-level authorization
* [ ] Add authorization/IDOR tests
* [ ] Restrict production CORS
* [ ] Add security headers
* [ ] Harden file uploads
* [ ] Add request-size limits
* [ ] Remove unfinished/dead UI controls
* [ ] Validate production environment configuration

---

## Phase 1 — Data Correctness

* [ ] Complete PostgreSQL migration
* [ ] Remove obsolete MySQL infrastructure
* [ ] Use one migration system
* [ ] Create one authoritative grade engine
* [ ] Add course credits
* [ ] Define grade calculation rules
* [ ] Add configurable GPA scales
* [ ] Standardize timezone handling
* [ ] Support nullable/TBD deadlines
* [ ] Improve assessment/category integrity
* [ ] Use database transactions for multi-step imports
* [ ] Enforce ownership in database queries

---

## Phase 2 — Automated Safety Net

* [ ] Backend integration tests
* [ ] Frontend tests
* [ ] Authorization tests
* [ ] Grade-engine unit tests
* [ ] GPA tests
* [ ] Timezone/date tests
* [ ] Syllabus-import tests
* [ ] Password-reset tests
* [ ] Upload-security tests
* [ ] GitHub Actions CI
* [ ] Linting
* [ ] Type checks
* [ ] Angular production build checks
* [ ] Dependency/security audits

---

## Phase 3 — Complete Existing UX

* [ ] Finish Angular migration
* [ ] Remove dead controls
* [ ] Complete loading states
* [ ] Complete error states
* [ ] Complete empty states
* [ ] Persist settings server-side
* [ ] Persist calendar information
* [ ] Add archive/restore
* [ ] Add global search
* [ ] Add notification center
* [ ] Add mobile navigation
* [ ] Improve onboarding
* [ ] Improve syllabus review flow

---

## Phase 4 — Production Operations

* [ ] Structured application logging
* [ ] Error monitoring
* [ ] Health endpoint
* [ ] Automated database backups
* [ ] Documented restore process
* [ ] Restore testing
* [ ] Transactional email
* [ ] Privacy policy
* [ ] Terms of service
* [ ] Account export
* [ ] Account deletion
* [ ] Data-retention policy
* [ ] Production observability

---

## Phase 5 — Product Differentiation

* [ ] Today / Next Move
* [ ] Smart priority system
* [ ] Estimated effort tracking
* [ ] Remaining-effort calculations
* [ ] Subtasks/checklists
* [ ] Recurring tasks
* [ ] Recurring classes
* [ ] Study blocks
* [ ] Smart Planner
* [ ] Exam/revision planner
* [ ] Google Calendar integration
* [ ] Natural-language Quick Add
* [ ] Redesigned course workspace
* [ ] Target-grade calculator
* [ ] What-if grade calculator
* [ ] Academic term management
* [ ] Mobile experience improvements
* [ ] Focus sessions

---

## Phase 6 — Ask Trackr AI

* [ ] Structured academic-data tools
* [ ] Controlled AI tool layer
* [ ] Course-document ingestion
* [ ] Document chunking
* [ ] Embeddings/retrieval
* [ ] Course-document Q&A
* [ ] Source/page citations
* [ ] Prompt-injection defenses
* [ ] Cross-user retrieval protection
* [ ] AI usage limits
* [ ] AI cost controls
* [ ] Context-aware Ask Trackr interface

---

## Phase 7 — Integrations & Advanced Experience

* [ ] Outlook Calendar
* [ ] ICS/iCal integration
* [ ] PWA installability
* [ ] Offline experience
* [ ] Browser push notifications
* [ ] Advanced academic analytics
* [ ] Better workload forecasting
* [ ] Improved cross-device synchronization
* [ ] Additional import/export options

---

# Later / Optional Features

The following features are intentionally not immediate priorities:

* teacher dashboards
* classroom publishing
* join codes
* parent accounts
* social feeds
* student communities
* chat rooms
* complex gamification
* full flashcard system
* full note-taking editor
* native iOS application
* native Android application
* large numbers of third-party integrations

Trackr should first make the core student workflow exceptional.

---

# Design Direction

Trackr's visual direction is:

> **Calm Academic Intelligence**

The interface should emphasize:

* clear information hierarchy
* generous whitespace
* focused task presentation
* calm visual design
* fast interactions
* course-specific colors
* responsive layouts
* academic context

Trackr should feel like a premium academic productivity product rather than a generic administration dashboard.

---

## Primary Navigation

```text
Today
Planner
Courses
Calendar
Grades
```

Secondary navigation:

```text
Settings
Help
Profile
```

Global action:

```text
Search or Ask Trackr...
```

---

# Core User Journey

The most important Trackr workflow is:

```text
REGISTER
   ↓
ADD COURSE / UPLOAD SYLLABUS
   ↓
REVIEW AI EXTRACTION
   ↓
COURSE CREATED
   ↓
ASSIGNMENTS APPEAR
   ↓
GRADES WORK CORRECTLY
   ↓
CALENDAR WORKS
   ↓
TODAY TELLS THE STUDENT WHAT TO DO
   ↓
REMINDER ARRIVES
   ↓
COMPLETE TASK
   ↓
PROGRESS + GRADE UPDATE
```

The product is not considered complete until this workflow works reliably across desktop and mobile.

---

# What Makes Trackr Different

Trackr is not intended to become:

```text
Notion
+
Canvas
+
Todoist
+
ChatGPT
+
Every Student App
```

inside one product.

Trackr's intended advantage is connecting:

```text
Course Structure
       +
Academic Deadlines
       +
Assessment Weight
       +
Grades
       +
Available Time
       +
Workload
       ↓
Recommended Next Action
```

The long-term product goal is:

> **Trackr understands the structure of a student's semester, deadlines, workload, and grades — and turns that information into the next thing they should do.**

---

# Project Status

🚧 **Active Development**

Trackr began as a university team project and is now being independently redesigned and developed into a modern full-stack software product.

Current modernization work includes:

* Angular frontend migration
* backend cleanup
* PostgreSQL migration
* improved security
* grade-engine consolidation
* UI/UX redesign
* automated testing
* production deployment preparation

Because Trackr is actively being migrated, the repository may temporarily contain legacy or transitional code.

---

# Screenshots

Screenshots will be added as the redesigned Angular interface stabilizes.

Planned showcase screens:

```text
Today
Planner
Courses
Course Detail
Grades
Calendar
Mobile
```

---

# Contributing

Trackr is currently an independently developed project.

Formal contribution guidelines may be added in the future.

---

# Author

**Zohra Haidary**

Computer Science student and developer building Trackr as an independent full-stack software project.

GitHub:

```text
https://github.com/HZohra
```

Repository:

```text
https://github.com/HZohra/Trackr
```

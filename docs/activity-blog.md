# cp476-project — Project Wiki
## Overview
**Project:** Trackr — Student Academic Management App
**Course:** CP476B – Internet Computing (Spring 2026)
**Repo:** [cp476-project](https://github.com/kruugerr/cp476-project)
**Status:** In Progress

---

**Task Assignments (Milestone 1):**
- Project Lead & GitHub/Repo: Zach — repo setup, README, Kanban
- Project Proposal: Zach & Ferzan 
- Requirements / User Stories: Tyler & Win
- Wireframes & Navigation Map: Zohra & Ali
- Data Planning: Rafae & Thanh

## Definition of Done
A task is done when it is completed, reviewed by a teammate, tested where applicable, documented, and merged to main.

---

## Meeting Minutes

### Kickoff Meeting — May 12, 2026
- 1 hour (initial group meeting)

**Attendance:** Zohra, Zach, Tyler, Thanh, Ferzan

**Discussion:**
- Agreed on building Trackr — a web app that uses AI to extract and organize academic information from student-uploaded syllabi
- Defined core user stories covering the student and admin flows

**Decisions Made:**
- [x] Project confirmed: Trackr
- [x] Project scope defined
- [x] Confirm who is doing what work
- [ ] Confirm tech stack

---

### Team Planning Meeting — May 14, 2026
- 1 hour

**Attendance:** Zohra, Thanh, Tyler, Rafae, Ali

**Discussion:**
- Reviewed Milestone 1 requirements and expected deliverables
- Agreed to organize documentation using a `/docs` folder

**Decisions Made:**
- [x] Milestone 1 tasks divided among all team members
- [x] Team members confirmed and understood their assigned tasks
- [x] Agreed to organize documentation using a `/docs` folder
- [ ] Finalize user stories
- [ ] Finalize wireframes
- [ ] Confirm final tech stack

---

### Progress Check-in — May 26, 2026
- 1 hour

**Attendance:** Tyler, Zach, Thanh, Rafae

**Discussion:**
- Reviewed progress on Milestone 1 deliverables
- Discussed conflicts and issues with current project design

**Decisions Made:**
- [x] Removed Teacher role — only Student and Admin roles remain
- [ ] Finalize user stories
- [ ] Finalize wireframes

---

### Milestone 1 Review Meeting — June 3, 2026
- 1 hour

**Attendance:** Full group

**Discussion:**
- Full group review of all Milestone 1 deliverables prior to submission
- Reviewed wireframes, user stories, data model, and proposal

**Decisions Made:**
- [x] All Milestone 1 deliverables reviewed and approved for submission
- [x] Submission confirmed

---

## Key Design & Architecture Decisions

**App Concept:** Trackr accepts student syllabus PDF uploads, uses an LLM to extract academically relevant information (assignments, due dates, grade weights, professor info), and presents it in an organized dashboard that persists throughout the semester.

**Roles:** Two roles — Student (primary user) and Admin (internal dev team use for platform oversight and user management). Teacher role was considered and removed (May 26 decision).

**Feature Scope:**
- *Must Have:* Authentication (email/password + Google SSO), syllabus upload + AI extraction, extraction review/edit screen, semester dashboard, course/assignment views, GPA calculator (4.0 and 12.0 scale), admin interface.
- *Should Have:* Hours tracking, deadline reminders (email), "What do I need?" grade calculator, colour-coded courses, syllabus re-upload with diff detection.
- *Out of Scope for Now:* AI study planner, smart deadline risk detection, group study rooms, Pomodoro timer, shared notes.

**Data Model:** Four core entities — `Users`, `Courses`, `Activities`, `Activity Category`. Users → Courses → Activities (each one-to-many). Activity Categories are one-to-many with Activities. User preferences (GPA scale, reminder defaults, dark/light mode) stored on the User record and copied into Activity records on creation.

### Milestone 2 Front-End Progress — June 16, 2026
- 1 hour

**Attendance:** Tyler, Zach, Thanh, Rafae, Ali, Qichen Hao, Zohra

**Discussion:**
- Reviewed Milestone 2 front-end progress
- Pages were assigned and started

**Decisions Made:**
- [x] Keep the UI functional with mock data while the database/API setup is still being completed

---

### Database & Back-End Planning — June 25, 2026
- 1 hour

**Attendance:** Tyler, Zach, Thanh, Rafae, Ali, Qichen Hao, Zohra

**Discussion:**
- Discussed database design and back-end setup
- Finalized the main data entities: Users, Courses, Activities, Enrollment, and Activity Category

**Decisions Made:**
- [x] Finalized main entities: Users, Courses, Activities, Enrollment, Activity Category
- [ ] SQL table creation
- [ ] ER diagram

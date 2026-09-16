# cp476-project

> AI-powered school management app for students and teachers.

---

## Overview

This app lets students upload a course syllabus and have it automatically parsed into a structured course with assignments, due dates, grading weights, office hours, and other important course information. Teachers can publish courses with a join code, and students can enroll to have course information added to their semester dashboard.

---

## Features

- AI-powered syllabus ingestion through PDF upload or pasted text
- Semester dashboard with calendar and weekly views
- Course view with grade tracking
- Assignment/activity tracker with due dates, grading weights, status, hours logged, and grades
- GPA tracker using both 4.0 and 12.0 scales
- Reminder settings through email or WhatsApp
- Teacher course publishing with join codes
- Student enrollment flow

---

## Tech Stack

| Layer     | Technology                         |
| --------- | ---------------------------------- |
| Frontend  | HTML, CSS, JavaScript              |
| Backend   | Node.js                            |
| Database  | PostgreSQL                         |
| Auth      | To be implemented                  |
| AI / LLM  | To be implemented                  |
| Reminders | Email / WhatsApp, planned feature  |
| Hosting   | Local development for Milestone 02 |

---

## Getting Started

### Prerequisites

To view the front-end, you only need **one** of:

- **Python 3** — preinstalled on macOS/Linux (recommended, nothing to install), **or**
- **Node.js + npm** — if you prefer the `npx serve` option below

Plus **Git** to clone the repo. (Node.js and PostgreSQL are only needed for the
optional back-end/database, which are still in progress.)

---

## How to Run Locally

**Both servers must be running, on these exact ports:**

| Part      | Port   |
| --------- | ------ |
| Front-end | `3000` |
| Back-end  | `5000` |

Changing either port breaks the app.

### Prerequisites

- **Node.js 18+** and npm

That's all — the database is hosted, so there's nothing to install or create.

### 1. Clone the Repository

```bash
git clone https://github.com/kruugerr/cp476-project.git
cd cp476-project
```

### 2. Add the Environment File

The app needs `backend/.env`, which holds the database credentials, JWT
secret, and Claude API key. It is **not** in this repository — it has been submitted
separately alongside the project.

Copy the provided `.env` file into the `backend/` folder:

```
cp476-project/
└── backend/
    └── .env        <- (place it here)
```

The back-end will not start without it.

### 3. Install Back-End Dependencies

```bash
cd backend
npm install
```

The front-end has no dependencies and needs no install step.

### 4. Start Both Servers

Open **two terminals**, both from the project root.

**Terminal 1 — back-end API (port 5000):**

```bash
cd backend
npm run dev
```

Wait for `Database connection successful.` and
`Server running on http://localhost:5000`. If the database line doesn't
appear, check that `.env` is in the right place.

**Terminal 2 — front-end (port 3000):**

```bash
npx serve frontend -l 3000
```

Then open **http://localhost:3000**

---

## Project Structure

```text
cp476-project/
├── docs/              # planning docs, meeting minutes, activity blog/wiki
├── frontend/          # front-end files
├── backend/           # back-end server files
└── README.md
```

---

## Activity Blog / Wiki

The activity blog/wiki is maintained in the project documentation and includes weekly meeting notes, task assignments, progress updates, design decisions, blockers, and resolutions.

---

## Team Member Contributions

| Name          | Contribution Summary                                                                |
| ------------- | ----------------------------------------------------------------------------------- |
| Zach Gould    | Worked on project setup, GitHub repository organization, and development tasks.     |
| Zohra Haidary | Worked on planning documentation, front-end/design tasks, and project organization. |
| Tyler Rizzi   | Worked on back-end setup, README updates, and project documentation.                |
| Thanh Phan    | Worked on development tasks, milestone planning, and implementation support.        |
| Qichen Hao    | Worked on planning, project documentation, and implementation support.              |

---

## Course

CP476 — Internet Computing
Wilfrid Laurier University

# Trackr — Less Tracking, More Studying 🎓

> A full-stack academic productivity platform that helps students organize courses, assignments, grades, deadlines, and semester progress in one place.

Trackr was originally developed as a team project for **CP476 — Internet Computing at Wilfrid Laurier University**.

Following the original course submission, I am continuing development independently by improving the existing application, adding new features, expanding its AI capabilities, and preparing the project for deployment.

---

## 📖 Overview

Trackr is designed to reduce the amount of time students spend manually organizing course information.

Students can upload or provide course syllabus information and use Trackr to organize important academic details such as assignments, deadlines, grading weights, courses, and grades.

The application combines academic tracking tools with a full-stack architecture consisting of a JavaScript frontend, Node.js backend, PostgreSQL database, authentication, and AI-assisted syllabus processing.

---

# ✅ Current Features

The following functionality is currently part of the application.

### 🔐 User Authentication

* User account authentication
* JWT-based authentication
* Password protection and validation
* Protected user and administrative routes
* Role-based backend access

---

### 📚 Course Management

* Create and manage courses
* Store course information
* Organize courses by semester
* View course-related academic information from the student dashboard

---

### 📄 Syllabus Processing

* Upload or provide syllabus information
* Extract important course information from a syllabus
* Convert syllabus information into structured academic data
* Extract assignment information
* Extract deadlines
* Extract grading weights and course-related information

---

### ✅ Assignment & Activity Tracking

Students can track academic activities including:

* Assignment/activity name
* Due date
* Grading weight
* Completion status
* Grades
* Hours spent on activities

This allows students to keep course work and deadlines organized from one place.

---

### 📊 Grade & GPA Tracking

* Track grades across courses
* View academic statistics
* Monitor course performance
* GPA tracking
* Support for academic progress monitoring

---

### 🏠 Student Dashboard

The dashboard provides students with a centralized view of their academic information, including:

* Courses
* Assignments and activities
* Deadlines
* Academic progress
* Grade information

---

### 👤 Student Profile & Statistics

* Student profile information
* Academic statistics
* Course-related progress data
* User-specific academic information

---

### 🛡️ Validation & Access Control

The backend includes:

* API validation
* Authentication middleware
* Protected endpoints
* Role-based route protection
* Database validation

---

### 📱 Responsive Interface

Trackr includes a responsive web interface designed to work across different screen sizes.

---

# 🚧 Current Development

After the original university project was submitted, I began continuing development independently.

The current goal is to transform Trackr from a university project into a more complete, deployable academic productivity application.

### 🤖 Trackr AI Chatbot

I am currently working on adding an AI-powered chatbot that will allow students to interact with their academic information conversationally.

Planned chatbot capabilities include questions such as:

* "What assignments do I have coming up?"
* "What should I work on this week?"
* "When is my next deadline?"
* "What assignments are worth the most?"
* "How am I doing in this course?"
* "What do I need on my final to reach my target grade?"

The goal is for the chatbot to eventually use information stored inside Trackr rather than functioning as a general-purpose chatbot.

---

### 🔔 Notification & Reminder System

A notification system is also being developed to help students avoid missing important academic deadlines.

Planned functionality includes:

* Upcoming assignment reminders
* Deadline notifications
* Study reminders
* Custom reminder preferences
* Notifications based on course and assignment information

---

### 🧠 Expanded AI Features

Future AI functionality is being explored to make Trackr more useful as an academic assistant.

Potential additions include:

* More advanced syllabus understanding
* Course-aware chatbot responses
* Assignment prioritization
* Study recommendations
* Academic progress insights

These features are currently under development and are **not considered completed functionality yet**.

---

### 🚀 Deployment

Another major goal of the current development phase is deploying Trackr so that it can be accessed as a live web application rather than only through local development.

Deployment work includes:

* Production configuration
* Environment-variable management
* Database deployment
* Backend hosting
* Frontend hosting
* Security improvements
* Production testing

---

### 🎨 Continued UI/UX Improvements

The interface is also being improved to make the application:

* Easier to navigate
* More visually consistent
* More responsive
* More intuitive for students
* Better suited for a production environment

---

# 🛠️ Tech Stack

| Layer             | Technology             |
| ----------------- | ---------------------- |
| Frontend          | HTML, CSS, JavaScript  |
| Backend           | Node.js / Express      |
| Database          | PostgreSQL             |
| Authentication    | JWT Authentication     |
| Password Security | bcrypt                 |
| AI Integration    | Claude / Anthropic API |
| Version Control   | Git & GitHub           |
| Design            | Figma                  |
| Deployment        | In progress            |

---

# 🏗️ Architecture

```text
User
 │
 ▼
Frontend
HTML / CSS / JavaScript
 │
 │ HTTP / API Requests
 ▼
Node.js / Express Backend
 │
 ├── Authentication
 ├── Course Management
 ├── Assignment Management
 ├── Grade / GPA Logic
 ├── Syllabus Processing
 └── AI Services
 │
 ▼
PostgreSQL Database
```

As development continues, additional services such as the chatbot and notification system will be integrated into this architecture.

---

# 🚀 Getting Started

## Prerequisites

You will need:

* Node.js 18+
* npm
* Git
* Access to the required PostgreSQL database
* Required environment variables/API credentials

---

# 💻 Running Trackr Locally

Both the frontend and backend need to be running.

| Application | Port   |
| ----------- | ------ |
| Frontend    | `3000` |
| Backend API | `5000` |

---

## 1. Clone the Repository

```bash
git clone https://github.com/HZohra/Trackr.git
cd Trackr
```

---

## 2. Configure Environment Variables

Create a `.env` file inside the backend directory.

```text
Trackr/
└── backend/
    └── .env
```

The environment file contains private configuration such as:

* Database credentials
* JWT secret
* AI API credentials

Environment files containing secrets should **never be committed to GitHub**.

---

## 3. Install Backend Dependencies

```bash
cd backend
npm install
```

The current frontend does not require a separate dependency installation step.

---

## 4. Start the Backend

From the backend directory:

```bash
npm run dev
```

The API should run on:

```text
http://localhost:5000
```

---

## 5. Start the Frontend

Open another terminal from the project root:

```bash
npx serve frontend -l 3000
```

Then open:

```text
http://localhost:3000
```

---

# 📂 Project Structure

```text
Trackr/
│
├── frontend/
│   ├── HTML
│   ├── CSS
│   └── JavaScript
│
├── backend/
│   ├── routes
│   ├── authentication
│   ├── API logic
│   ├── database logic
│   └── AI integration
│
├── docs/
│   ├── planning documentation
│   ├── meeting notes
│   └── project documentation
│
└── README.md
```

---

# 🗺️ Development Roadmap

### Completed / Existing

* [x] Full-stack application architecture
* [x] Student authentication
* [x] JWT-protected routes
* [x] Course management
* [x] Assignment/activity tracking
* [x] Grade tracking
* [x] GPA/progress tracking
* [x] Student dashboard
* [x] Student profile
* [x] Academic statistics
* [x] Syllabus information processing
* [x] PostgreSQL database integration
* [x] Backend API
* [x] Responsive frontend

### Currently Developing

* [ ] Trackr AI chatbot
* [ ] Academic-data-aware chatbot responses
* [ ] Deadline notification system
* [ ] Custom reminder system
* [ ] Additional student productivity features
* [ ] UI/UX improvements
* [ ] Production deployment
* [ ] Production security improvements

### Future Improvements

* [ ] Smarter assignment prioritization
* [ ] Study recommendations
* [ ] Expanded academic analytics
* [ ] More advanced AI course assistance
* [ ] Additional notification options
* [ ] Improved mobile experience

---

# 👥 Original Team Project

Trackr was originally created collaboratively as part of **CP476 — Internet Computing** at Wilfrid Laurier University.

| Team Member       | Original Project Contributions                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Zach Gould        | Project setup, repository organization, and development tasks                                   |
| **Zohra Haidary** | Planning documentation, frontend and backend development/design tasks, and project organization |
| Tyler Rizzi       | Backend setup, README updates, and project documentation                                        |
| Thanh Phan        | Development tasks, milestone planning, and implementation support                               |
| Qichen Hao        | Planning, project documentation, and implementation support                                     |

---

# 👩‍💻 Continued Development

Following the completion of the university project, **Zohra Haidary is independently continuing development of Trackr**.

Current post-submission work focuses on:

* Expanding the existing application
* Improving frontend and backend functionality
* Developing the Trackr chatbot
* Building a notification/reminder system
* Adding new student productivity features
* Improving the user experience
* Preparing Trackr for production deployment

This repository now serves as both the original collaborative academic project and the continued development of Trackr beyond the course requirements.

---

# 📚 Course

**CP476 — Internet Computing**
Wilfrid Laurier University

---

# 👩‍💻 Maintainer

**Zohra Haidary**

Computer Science — Wilfrid Laurier University

GitHub: [github.com/HZohra](https://github.com/HZohra)

LinkedIn: [linkedin.com/in/zohra-haidary-318575201](https://www.linkedin.com/in/zohra-haidary-318575201/)

---

## ⭐ Project Status

**Active Development**

Trackr is currently being expanded beyond its original university-project scope with new AI, chatbot, notification, productivity, UI/UX, and deployment functionality.

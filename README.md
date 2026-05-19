# 🚀 SkillSense AI - Placement Readiness & Skill Verification Platform

**SkillSense AI** is a state-of-the-art, full-stack placement readiness and skill verification MERN application. It is designed to empower **Students** with AI-driven resume parsing, code reviews, and mock interviews, while giving **Universities** rich cohort analytics and **Recruiters** robust candidate discovery and pipeline management.

---

## 🌟 Key Features

### 🎓 Student Portal
- **AI-Powered Onboarding:** Automatically extracts skills, experience, and education from uploaded PDF resumes.
- **Skill Passport:** A verified, shareable digital skill profile with real-time score updates and a downloadable professional PDF.
- **GitHub Code Analysis:** Connects to GitHub to perform automatic deep code audits, architecture detection, commit pattern analysis, and generates AI-driven engineering scores.
- **AI Mock Interview Lab:** 
  - Adaptive chat sessions with follow-up questions tailored to role, seniority, and style.
  - Rubric-based grading across communication, technical depth, ownership, tradeoffs, and confidence.
  - Comprehensive performance reports and adaptive learning roadmaps.
- **Interactive Resume Builder:** Live-editable fields with real-time PDF generation and styling options.

### 💼 Recruiter Portal
- **Candidate Discovery:** Search, filter, and rank students using advanced criteria (skills, university, placement readiness).
- **AI Job Matching:** Input a Job Description (JD) and immediately find matched candidates sorted by compatibility score.
- **Pipeline & Scheduler:** Manage candidates across recruitment stages (Applied, Interviewing, Offered, Rejected) and schedule meetings directly in-app.
- **Saved Searches:** Save custom search query filters for quick reuse.

### 🏫 University Portal
- **Cohort Analytics:** High-level dashboard showing total students, branch distributions, average readiness scores, and performance trends.
- **Verification Workflows:** Verify student profiles, skills, and projects, updating the platform's Authenticity Score.
- **Cohort Interventions:** Identify struggling students early and track custom interventions.
- **Bulk Onboarding:** Register entire batches of students simultaneously using CSV uploads.
- **Placement Drive Management:** Create, track, and monitor active campus recruitment drives.

### 🛡️ Platform & Operations
- **Admin Dashboard:** Approve university and recruiter requests, manage users, and oversee system logs.
- **OpenAI-Compatible LLM integration:** Easy configuration with OpenAI, Groq, or any compatible endpoint.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, TanStack Query, Recharts, Radix UI.
* **Backend:** Node.js, Express.js (v5), Mongoose, Multer (file handling), PDFkit & PDF-Parse.
* **Database:** MongoDB (using MongoDB Atlas in cloud or MongoDB Memory Server as local fallback).
* **Security:** JWT (Access & Refresh tokens), bcryptjs (password hashing), Helmet (security headers), Express Rate Limiter.

---

## 📁 Project Directory Structure

```text
SkillsenceAI-main/
├── backend/                  # Node.js + Express Backend
│   ├── src/
│   │   ├── config/          # Database connection and configs
│   │   ├── controllers/     # API request-response controllers
│   │   ├── middleware/      # Authentication, file upload, and CORS middlewares
│   │   ├── models/          # Mongoose database schemas
│   │   ├── routes/          # REST API endpoints routing
│   │   ├── utils/           # AI parsers, seed files, and scoring utilities
│   │   └── server.js        # Server entry point
│   ├── uploads/             # Directory for stored resumes and media
│   └── package.json
│
├── frontend/                 # React + TypeScript Frontend (Vite)
│   ├── src/
│   │   ├── components/      # UI components (Layout, Dashboard, UI primitives)
│   │   ├── lib/             # API clients, helpers, and constant configurations
│   │   ├── pages/           # Platform pages (Dashboards, Registration, Interview Lab)
│   │   └── main.tsx         # Frontend entry point
│   ├── vite.config.ts
│   └── package.json
│
├── RENDER_DEPLOYMENT.md      # Step-by-step production hosting guide
├── package.json              # Main workspace workspace dependencies
└── .env.example              # Workspace-wide environment variables template
```

---

## 💻 Local Development Setup

Follow these steps to run SkillSense AI on your local machine:

### 1. Clone & Install Dependencies
First, install all dependencies in the workspace root, frontend, and backend folders with a single command:
```bash
npm run install:all
```

### 2. Configure Environment Variables
Create a `.env` file in both the `backend/` and `frontend/` folders (or copy them from `.env.example` at the root).

**Backend `.env`:**
```env
PORT=5000
MONGODB_URI=your-mongodb-atlas-uri
JWT_SECRET=your-secret-key
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
OPENAI_API_KEY=your-openai-api-key # Optional for AI features
```

### 3. Run Development Servers
Start both the React dev server and the Express nodemon server concurrently:
```bash
npm run dev
```

Your app will be live at `http://localhost:5173` (Frontend) and the API will be listening at `http://localhost:5000` (Backend).

---

## 🚀 Production Deployment (Render)

This platform is ready to be hosted as a **single, unified Render Web Service** since the Express backend serves the Vite production bundle automatically in production when built.

For full, step-by-step instructions on database whitelisting, Render build configuration, and environment setup, read the dedicated:
👉 [**Render Deployment Guide (RENDER_DEPLOYMENT.md)**](./RENDER_DEPLOYMENT.md)

---

## 📜 License

This project is licensed under the ISC License.

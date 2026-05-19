# SKILLSENCE AI - Placement Readiness Platform

## 🎯 Project Overview
SkillSense AI is a production-ready AI-based verification platform for skills and projects, built with a modern MERN-like stack (Node/Express backend, React/Vite frontend, MongoDB).

## 📋 Phase 1: Project Setup & Architecture
- [x] Unified monorepo structure (root package.json)
- [x] Node.js + Express backend setup
- [x] React + Vite + Tailwind frontend setup
- [x] MongoDB integration with Mongoose
- [x] Security middleware (Helmet, CORS, Rate Limiting)
- [x] Production build and serving logic in server.js

## 📋 Phase 2: Authentication & User Management
- [x] Custom User model with roles (Student, University, Recruiter)
- [x] JWT-based authentication (Access/Refresh tokens)
- [x] Role-based access control (RBAC) middleware
- [x] Profile management with role-specific fields
- [ ] OTP verification for secure login
- [ ] Password reset and email verification

## 📋 Phase 3: Core Features - Student Role
- [x] Resume upload and AI-driven parsing (PDF/TXT)
- [x] GitHub integration and deep repository analysis
- [x] Live Skill Passport and Dashboard
- [x] AI-driven Placement Readiness Scoring
- [ ] AI Interview evaluation (currently heuristic, upgrading to LLM)
- [ ] Professional Resume Builder

## 📋 Phase 4: AI Verification Engine
- [x] Heuristic-based scoring for coding, communication, and authenticity
- [x] GitHub signal analysis (fork ratio, commit quality, complexity)
- [ ] AI-generated text detection
- [ ] Code plagiarism analysis
- [ ] Authorship fingerprinting using NLP

## 📋 Phase 5: University/Institution Features
- [x] University Dashboard with student analytics
- [x] Placement Drive management (Creation & Eligibility tracking)
- [x] Student Intervention tracking
- [/] Batch student upload (Logic to process files into accounts pending)

## 📋 Phase 6: Recruiter/Company Features
- [x] Recruiter Dashboard with candidate search
- [x] Candidate pipeline management
- [x] Candidate report generation (PDF)
- [x] Saved searches and candidate filtering

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Lucide, Radix UI
- **Backend**: Node.js, Express, Mongoose (MongoDB)
- **AI/ML**: OpenAI/Groq API (via callAi utility), pdf-parse, pdfkit
- **Infrastructure**: Multer (file uploads), JWT (auth), bcrypt (security)

## 📁 Project Structure
```
skillsence-ai/
├── backend/
│   ├── src/
│   │   ├── config/ (DB, AI configs)
│   │   ├── controllers/ (Logic)
│   │   ├── models/ (Schema)
│   │   ├── routes/ (API endpoints)
│   │   ├── middleware/ (Auth, Errors)
│   │   └── utils/ (Parsers, Scorers)
│   └── uploads/ (Resumes, Batches)
├── frontend/
│   ├── src/
│   │   ├── components/ (UI & Shadcn)
│   │   ├── pages/ (Views)
│   │   └── hooks/ (Queries)
│   └── public/
├── package.json (Monorepo scripts)
└── .env (Environment variables)
```

## 🚀 Current Status
- Backend and Frontend foundations are solid and deployment-ready.
- Student registration, GitHub analysis, and Dashboards are fully functional.
- **Next Focus**: Upgrading AI Interview evaluation and completing University Batch Processing.


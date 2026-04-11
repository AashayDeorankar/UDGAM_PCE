# TechPrep

<p align="center">
  <strong>Notes, PYQs & Study Buddy for Engineering Students</strong>
</p>

<p align="center">
  One platform for branch-wise study material, company-wise interview prep, and 1:1 mentor sessions.
</p>

<p align="center">
  <a href="https://btechverse.cloud">Live Site</a> •
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a>
</p>

---

## Overview

**TechPrep** is a student-focused platform that brings together:

- **Study resources** — Branch-wise notes, PPTs, and previous year papers
- **Interview preparation** — Company-wise HR, DSA, and SQL questions with AI-powered answer feedback
- **Mentors** — Book 1:1 sessions with industry professionals from top companies
- **AI Study Buddy** — Get doubts solved in plain language with clear explanations

Built by students, for students — no paywall, no clutter.

---

## Features

| Feature | Description |
|--------|-------------|
| **Branch-wise resources** | Notes, PYQs, and presentations for CSE, AI/ML, ECE, ME, and other branches |
| **Interview prep** | Company-wise HR, DSA, and SQL questions; practice answers and get AI feedback (scores, improved answers) |
| **Mentors** | Browse and book 1:1 sessions with mentors from product companies |
| **AI Assistant** | Ask doubts in natural language; answers powered by LLM via OpenRouter |
| **Authentication** | Email/password and Google Sign-in (Firebase) |
| **Book a session** | Email and WhatsApp notifications (Resend, Twilio) |

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, React Router |
| **Auth** | Firebase Authentication |
| **AI** | OpenRouter (GPT) via Node.js API |
| **Storage** | AWS S3 (materials), Firebase (optional) |
| **Email / SMS** | Resend, Twilio (book-session) |
| **Backend** | Node.js (API server for chat, presign, run-code, book-session) |

---

## Prerequisites

- **Node.js** 18 or later
- **npm** (or yarn / pnpm)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Aman6917-ctrl/btechverse-hub.git
cd btechverse-hub
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values. **Do not commit `.env`** — it is listed in `.gitignore`.

#### Frontend (required for run)

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_API_BASE_URL` | Backend API URL (e.g. `http://localhost:3001` for local dev) |

Get Firebase values from [Firebase Console](https://console.firebase.google.com) → Project settings.

#### Backend (required for AI and features)

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai/keys) API key (for AI Buddy) |
| `OPENROUTER_MODEL` | Model ID (e.g. `openai/gpt-3.5-turbo`) |

For **book-session**, S3 presign, and optional features, see `.env.example` and **DEPLOY.md**.

### 3. Run locally

```bash
npm run dev
```

This starts:

- **Frontend** — Vite dev server (e.g. http://localhost:5173)
- **API** — Node server on port 3001 (chat, presign, book-session, run-code)

Open the URL shown in the terminal. If port 3001 is in use, stop the process using it and run `npm run dev` again.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run frontend + API (recommended for local development) |
| `npm run dev:web` | Frontend only (Vite) |
| `npm run dev:api` | API only (port 3001) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run sync:s3` | Sync branch materials from S3 (optional) |

---

## Project Structure

```
techprep/
├── src/
│   ├── components/     # UI components, layout, sections
│   ├── contexts/      # AuthContext
│   ├── data/          # Mentors, companies, DSA/SQL questions
│   ├── integrations/  # Firebase, Supabase
│   ├── lib/           # Utils, API helpers
│   └── pages/         # Route pages (Index, Auth, Mentors, InterviewPrep, etc.)
├── server/             # Node API (api.mjs, chat.mjs, book-session.mjs, run-code.mjs, presign)
├── public/            # Static assets, favicon, _redirects, _headers
├── .env.example       # Environment template
├── DEPLOY.md          # Deployment and production env checklist
└── package.json
```

---

## Deployment

1. Push the repository to GitHub (ensure `.env` is not committed).
2. Connect the repo to your hosting provider (e.g. **Netlify** for frontend, **Render** for API).
3. Configure **environment variables** in the provider dashboard using the same keys as in `.env`. See **DEPLOY.md** for the full list.
4. **Build command:** `npm run build`
   **Output directory:** `dist`

If the API is deployed separately (e.g. Render), set the server-side env vars there and set `VITE_API_BASE_URL` in the frontend to that API URL.

---

## License

Built for B.Tech students. Use and share as you like.

---

## Links

- **Live site:** [btechverse.cloud](https://btechverse.cloud)
- **Repository:** [github.com/Aman6917-ctrl/btechverse-hub](https://github.com/Aman6917-ctrl/btechverse-hub)

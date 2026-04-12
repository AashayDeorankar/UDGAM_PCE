# TechPrep

Notes, PYQs, interview prep, and mentor sessions for engineering students.

## Overview

TechPrep is a student-first platform that combines:

- Branch-wise study resources (notes, PPTs, PYQs)
- Company-wise interview prep (HR, DSA, SQL)
- 1:1 mentor sessions with industry professionals
- AI Study Buddy for clear, plain-language help

Built by students, for students.

## Features

- Branch-wise resources for multiple departments
- Company-wise HR, DSA, and SQL question banks
- AI feedback on answers (scores, improved responses)
- Mentor discovery and booking
- Firebase auth (email/password + Google)
- Notifications via email and WhatsApp (Resend, Twilio)

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, React Router
- Backend: Node.js API (chat, presign, run-code, book-session)
- Auth: Firebase Authentication
- AI: OpenRouter LLMs
- Storage: AWS S3, Firebase (optional)
- Email/SMS: Resend, Twilio

## Project Structure

```
VNIT/
├── src/                 # React app
├── server/              # Node API (api, chat, book-session, presign, run-code)
├── server-python/       # Optional Python services
├── public/              # Static assets
├── scripts/             # Utility scripts
├── .env.example          # Environment template
├── DEPLOY.md             # Deployment checklist
└── package.json
```

## Prerequisites

- Node.js 18+
- npm (or yarn / pnpm)

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` with your keys. Do not commit `.env`.

### Required environment variables (minimum)

Frontend:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_API_BASE_URL` (e.g. `http://localhost:3001`)

Backend:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (e.g. `openai/gpt-3.5-turbo`)

For full variables (S3, Resend, Twilio, Supabase), see `.env.example` and `DEPLOY.md`.

## Run Locally

```bash
npm run dev
```

This starts:

- Vite frontend (default: http://localhost:5173)
- Node API on port 3001

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run frontend + API |
| `npm run dev:web` | Frontend only |
| `npm run dev:api` | API only |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run sync:s3` | Sync materials from S3 (optional) |
| `npm run test:chat` | Test chat pipeline |

## Python Service (Optional)

The `server-python` folder includes a small FastAPI service. Install its dependencies if needed:

```bash
pip install -r server-python/requirements.txt
```

## Deployment

See `DEPLOY.md` for production setup and environment variables. Build command is:

```bash
npm run build
```

Output directory: `dist`

If the API is deployed separately, set `VITE_API_BASE_URL` to the API URL.

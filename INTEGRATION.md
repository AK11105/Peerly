# Peerly — Integration Guide

## Architecture

```
Browser  →  Next.js (port 3000)  →  /api/* proxy  →  FastAPI (port 8000)  →  Ollama (port 11434)
```

## Quick Start

### 1. Ollama (required for AI features)

```bash
# Install from https://ollama.com then pull the model:
ollama pull llama3
ollama serve   # runs on http://localhost:11434
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at http://localhost:8000  
Swagger docs at http://localhost:8000/docs

### 3. Frontend

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

## Integration changes summary

| File | Change |
|------|--------|
| `backend/app/ai.py` | Calls Ollama/llama3 (original setup preserved) |
| `lib/api.ts` | Shared API client — all endpoints in one place |
| `app/weave/[id]/page.tsx` | **New** — dynamic weave viewer (create → redirect here) |
| `app/my-weaves/page.tsx` | **New** — lists your created weaves (localStorage tracking) |
| `app/page.tsx` | Redirects `/` → `/explore` |
| `app/explore/page.tsx` | Fetches live weaves from backend with search |
| `app/create/page.tsx` | Uses API client + saves weave ID to My Weaves |
| `components/peerly/navbar.tsx` | My Weaves link fixed: `/` → `/my-weaves` |
| `components/peerly/add-node-panel.tsx` | Accepts `weaveId` prop; no hardcoded IDs |
| `components/peerly/contribute-modal.tsx` | Accepts `weaveId` prop; no hardcoded IDs |
| `next.config.mjs` | `/api/*` proxy rewrite → backend |

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Peerly is an AI-augmented collaborative knowledge mapping platform. Users create and explore "weaves" (knowledge graphs) with AI-generated scaffolding that the community can contribute to.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui components
- **Backend**: FastAPI (Python) with file-based JSON storage
- **Authentication**: Clerk
- **Database**: Supabase (user plans, display names)
- **AI**: Ollama (llama3) for weave generation, gap detection, and node explanations
- **Gemini API**: Used for AI-powered features

## Commands

```bash
# Frontend (Next.js)
npm run dev          # Start dev server on localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Backend (FastAPI) - run in separate terminal
cd backend
source myvenv/Scripts/activate  # Windows: myvenv\Scripts\activate
uvicorn app.main:app --reload   # Start backend on localhost:8000

# Database
npm run seed         # Seed database with initial data
```

## Architecture

### Frontend Structure (`/`)

- `app/` - Next.js app router pages and API routes
  - `explore/` - Main feed of weaves organized by field
  - `weave/[id]/` - Individual weave viewer with mind map
  - `node/[weaveId]/[nodeId]/` - Node detail with AI explainer
  - `create/` - Weave creation page
  - `my-weaves/` - User's created weaves
  - `community/` - Community hub for messages and discussions
  - `api/` - Next.js API routes for frontend-backend communication

- `components/`
  - `peerly/` - Custom components (navbar, weave-viewer, mind-map-view, community hub)
  - `ui/` - shadcn/ui component library

- `lib/` - Utilities and domain logic
  - `supabase.ts` - Supabase client
  - `check-plan.ts` - Pro plan verification
  - `lumens-context.tsx` - Virtual currency context for AI actions
  - `community.ts` - Community hub operations
  - `types.ts` - TypeScript interfaces (Weave, WeaveNode, etc.)

- `hooks/` - React hooks
  - `use-current-user.ts` - Clerk user retrieval
  - `use-realtime-weave.ts` - Real-time weave updates

### Backend Structure (`/backend`)

- `app/main.py` - FastAPI entry point with CORS middleware
- `app/routes.py` - API endpoints:
  - `/weaves` - List, get, create, delete weaves
  - `/weaves/{id}/contribute` - Replace scaffold nodes with community contributions
  - `/weaves/{id}/nodes` - Add nodes with background gap detection
  - `/nodes/explain` - Generate 400-600 word node explanations via Ollama
- `app/ai.py` - AI logic using Ollama (llama3):
  - `generate_weave()` - Create curriculum nodes from topic
  - `detect_gap()` - Find missing prerequisites when adding nodes
  - `explain_node()` - Generate deep-dive explanations
- `app/store.py` - File-based JSON storage (`backend/data/weaves.json`)
- `app/models.py` - Pydantic models (Weave, Node, ScaffoldNode)

### Data Flow

1. User creates a weave → Frontend calls `/api/weaves/generate` → Backend calls Ollama → Returns scaffold nodes
2. User contributes to a scaffold → Scaffold replaced → Background gap detection suggests new scaffolds
3. User views a node → Can request AI explanation → Ollama generates 400-600 word deep-dive
4. Lumens (virtual currency) spent on AI actions, tracked via Supabase

### Authentication & Billing

- Clerk handles authentication via `@clerk/nextjs`
- Webhooks sync user data to Supabase (`/api/webhooks/clerk`)
- Pro plan features: unlimited AI generations, priority support
- Clerk Billing UI components handle checkout/portal

### Key Patterns

- **cn()** utility in `lib/utils.ts` merges Tailwind classes with `clsx` + `tailwind-merge`
- **Scaffold system**: AI generates placeholder nodes (`is_scaffold: true`) that users replace with real content
- **Background gap detection**: Uses threading to avoid blocking API responses
- **Real-time updates**: Supabase subscriptions for live weave changes

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_API_URL` - Backend URL (default: http://localhost:8000)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side plan checks
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`
- `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` - AI providers

## Notes

- Backend uses file-based storage (`backend/data/weaves.json`) - no database migrations needed
- TypeScript build errors ignored in `next.config.mjs` for faster iteration
- Images unoptimized in dev (see `next.config.mjs`)
- CORS allows all origins in development - tighten for production

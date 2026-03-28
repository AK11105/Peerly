# Peerly — Architecture

```
Browser  →  Next.js (port 3000)  →  /api/* routes  →  Supabase + Gemini
```

All backend logic runs as Next.js API routes. The Python/FastAPI backend is no longer used.

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind, shadcn/ui |
| Database | Supabase (Postgres) |
| Realtime | Supabase Realtime (postgres_changes) |
| AI | Google Gemini 2.0 Flash (`@google/generative-ai`) |
| Deployment | Vercel |

See `SETUP.md` for setup instructions.

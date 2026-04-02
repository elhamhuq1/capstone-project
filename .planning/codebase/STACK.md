# Technology Stack

**Analysis Date:** 2026-04-02

## Languages

**Primary:**
- TypeScript 5.x - All application source code (`src/`)
- TSX - React components and Next.js pages (`src/app/`, `src/components/`)

**Secondary:**
- CSS - Global styles only (`src/app/globals.css`)
- JavaScript - One legacy backfill script (`scripts/backfill-final-submissions.js`)

## Runtime

**Environment:**
- Node.js 24.x (v24.14.1 detected on host machine)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.7 - Full-stack web framework using App Router; API routes for all backend logic; React 19 server/client components

**UI:**
- React 19.2.3 - UI rendering
- React DOM 19.2.3 - DOM bindings
- Tailwind CSS 4.x - Utility-first CSS via `@tailwindcss/postcss` plugin
- react-markdown 10.1.0 - Markdown rendering in AI chat bubbles (`src/components/ChatPanel.tsx`)
- remark-gfm 4.0.1 - GitHub Flavored Markdown extension for react-markdown

**Build/Dev:**
- `@tailwindcss/postcss` 4.x - PostCSS integration for Tailwind v4 (`postcss.config.mjs`)
- drizzle-kit 0.31.10 - Schema push and migration tooling (`drizzle.config.ts`)
- ESLint 9.x - Linting via `eslint-config-next` core-web-vitals + TypeScript rules (`eslint.config.mjs`)

## Key Dependencies

**Critical:**
- `@google/generative-ai` 0.24.1 - Google Gemini AI SDK; all AI chat is routed through this (`src/lib/gemini.ts`)
- `drizzle-orm` 0.45.1 - Type-safe ORM; all database queries go through this (`src/lib/db/queries.ts`, `src/lib/db/index.ts`)
- `pg` 8.20.0 - PostgreSQL driver used with Drizzle ORM's `node-postgres` adapter (`src/lib/db/index.ts`)
- `@neondatabase/serverless` 1.0.2 - Neon serverless Postgres driver; present in dependencies but not used in current `src/lib/db/index.ts` (uses `pg` pool instead)

**Infrastructure:**
- `better-sqlite3` 12.8.0 - SQLite driver; present in dependencies and used in legacy `scripts/backfill-final-submissions.js`; the active database layer uses PostgreSQL via `pg`
- `ollama` 0.6.3 - Ollama npm client; present in dependencies but proxied through `src/lib/ollama.ts` which re-exports Gemini functions — not actively called in production code path

## Configuration

**Environment:**
- `.env.local` present (contents not read)
- Required env vars from source inspection:
  - `DATABASE_URL` — PostgreSQL connection string (`src/lib/db/index.ts`)
  - `GEMINI_API_KEY` — Google Generative AI API key (`src/lib/gemini.ts`)
- Database connection pool: max 3 connections, 10s timeout, SSL with `rejectUnauthorized: false` (`src/lib/db/index.ts`)

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2017
- Strict mode enabled
- Path alias: `@/*` → `src/*`
- Module resolution: `bundler`

**Build:**
- `next.config.ts` - Minimal config (no custom settings)
- `postcss.config.mjs` - Tailwind PostCSS plugin only
- `drizzle.config.ts` - PostgreSQL dialect, schema at `src/lib/db/schema.ts`, credentials from `DATABASE_URL`

## Platform Requirements

**Development:**
- Node.js 24.x
- PostgreSQL database accessible via `DATABASE_URL` (Supabase or compatible)
- `GEMINI_API_KEY` for AI chat functionality
- Run with `npm run dev` (Next.js dev server)

**Production:**
- Vercel deployment target (inferred from `vercel.svg` in `public/` and git history referencing Vercel)
- PostgreSQL connection pool configured for serverless environment (max 3 connections)
- SSL required for database connection

---

*Stack analysis: 2026-04-02*

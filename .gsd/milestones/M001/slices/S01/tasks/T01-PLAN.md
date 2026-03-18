---
estimated_steps: 7
estimated_files: 9
---

# T01: Scaffold Next.js project with dependencies and Drizzle database layer

**Slice:** S01 — Project Foundation + Ollama AI Proof
**Milestone:** M001

## Description

Create the entire project foundation from an empty repository. This task runs `create-next-app` to generate the Next.js scaffold, installs all additional dependencies (Ollama client, better-sqlite3, Drizzle ORM), configures the critical `serverExternalPackages` webpack workaround, sets up the Drizzle database layer with a minimal initial schema, and verifies the dev server starts and the database is operational. Every downstream slice (S02–S05) depends on this foundation.

**Relevant skills:** The executor may load `frontend-design` for Tailwind patterns if needed, but this task is primarily scaffolding — no custom UI work.

## Steps

1. **Initialize Next.js project.** Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` in the working directory. Accept defaults (no Turbopack). This generates `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, and the full project structure.

2. **Install additional dependencies.** Run:
   ```bash
   npm install ollama better-sqlite3 drizzle-orm
   npm install -D @types/better-sqlite3 drizzle-kit
   ```

3. **Configure `next.config.ts` — add `serverExternalPackages`.** This is a HARD REQUIREMENT. Without it, webpack tries to bundle the `better-sqlite3` native module and crashes. Add to the Next.js config object:
   ```typescript
   serverExternalPackages: ['better-sqlite3'],
   ```
   The exact shape depends on the generated config — it may use `const nextConfig = { ... }` or `export default { ... }`. Add the key inside the config object.

4. **Create Drizzle config file `drizzle.config.ts`** at the project root:
   ```typescript
   import { defineConfig } from 'drizzle-kit';
   export default defineConfig({
     schema: './src/lib/db/schema.ts',
     out: './drizzle',
     dialect: 'sqlite',
     dbCredentials: { url: 'sqlite.db' },
   });
   ```

5. **Create database initialization module `src/lib/db/index.ts`:**
   ```typescript
   import Database from 'better-sqlite3';
   import { drizzle } from 'drizzle-orm/better-sqlite3';
   import * as schema from './schema';

   const sqlite = new Database('sqlite.db');
   sqlite.pragma('journal_mode = WAL');
   export const db = drizzle(sqlite, { schema });
   ```

6. **Create initial schema `src/lib/db/schema.ts`** with a minimal `participants` table:
   ```typescript
   import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
   import { sql } from 'drizzle-orm';

   export const participants = sqliteTable('participants', {
     id: integer('id').primaryKey({ autoIncrement: true }),
     email: text('email').notNull().unique(),
     name: text('name').notNull(),
     createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
   });
   ```
   This is intentionally minimal — S02 extends it heavily with sessions, writing samples, revisions, etc.

7. **Push schema to SQLite and update `.gitignore`.** Run `npx drizzle-kit push` to create the `sqlite.db` file with the `participants` table. Add `*.db` and `*.db-journal` and `*.db-wal` to `.gitignore` (they may already have a `*.db` entry from `create-next-app` — check first). Also ensure `drizzle/` output directory is NOT gitignored (migration metadata should be tracked).

## Must-Haves

- [ ] `npx create-next-app` scaffold runs successfully with TypeScript, Tailwind, App Router, `src/` dir
- [ ] `ollama`, `better-sqlite3`, `@types/better-sqlite3`, `drizzle-orm`, `drizzle-kit` all installed
- [ ] `next.config.ts` contains `serverExternalPackages: ['better-sqlite3']`
- [ ] `drizzle.config.ts` exists and points to `sqlite.db` with `dialect: 'sqlite'`
- [ ] `src/lib/db/index.ts` initializes Drizzle with better-sqlite3 and WAL mode
- [ ] `src/lib/db/schema.ts` defines `participants` table with `id`, `email`, `name`, `createdAt`
- [ ] `sqlite.db` exists at project root after `drizzle-kit push`
- [ ] `*.db` is in `.gitignore`

## Verification

- `npm run build` completes without errors (proves TypeScript compiles, webpack doesn't choke on better-sqlite3)
- `npm run dev` starts and `http://localhost:3000` renders the default landing page
- `ls sqlite.db` confirms the database file exists
- `npx drizzle-kit push` reports "No changes detected" or "Already up to date" on re-run (schema is applied)
- Quick smoke test: create a small Node script or use `node -e` to verify DB works:
  ```bash
  node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare('SELECT name FROM sqlite_master WHERE type=\"table\"').all())"
  ```
  Should output the `participants` table.

## Observability Impact

- **New inspection surfaces:** `sqlite.db` file at project root (check existence + query `sqlite_master` for table list); `npm run build` exit code proves webpack/TypeScript health; `npm run dev` on port 3000 proves runtime health.
- **Signals that change:** After this task, `ls sqlite.db` returns a file (previously absent); `node -e "require('better-sqlite3')('sqlite.db').prepare('SELECT name FROM sqlite_master WHERE type=\"table\"').all()"` returns `[{ name: 'participants' }]`.
- **Failure visibility:** If `serverExternalPackages` is missing, `npm run build` crashes with a `better-sqlite3` native module bundling error (visible in build stderr). If schema push fails, `sqlite.db` won't exist. If dependencies are missing, `npm install` or `npm run build` will error with unresolved modules.
- **How a future agent inspects this task:** Run `npm run build` (should exit 0), check `sqlite.db` exists, query its tables, and verify `next.config.ts` contains the `serverExternalPackages` entry.

## Inputs

- Empty repository (no prior code)
- Node.js 20.20.0 (confirmed available)
- npm (confirmed available)

## Expected Output

- Complete Next.js project scaffold in the working directory
- `package.json` with all required dependencies
- `next.config.ts` with `serverExternalPackages: ['better-sqlite3']`
- `drizzle.config.ts` at project root
- `src/lib/db/index.ts` — Drizzle + better-sqlite3 init
- `src/lib/db/schema.ts` — minimal participants schema
- `sqlite.db` at project root with `participants` table created
- Updated `.gitignore` with `*.db` entries

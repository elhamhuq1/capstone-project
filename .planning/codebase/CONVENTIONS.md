# Coding Conventions

**Analysis Date:** 2026-04-02

## Naming Patterns

**Files:**
- React page components: `page.tsx` (Next.js App Router convention, one per directory)
- React shared components: PascalCase, e.g., `ChatPanel.tsx`, `WritingEditor.tsx`, `SurveyForm.tsx`
- API route handlers: `route.ts` (Next.js convention, one per API directory)
- Library modules: camelCase, e.g., `queries.ts`, `schema.ts`, `gemini.ts`, `prompts.ts`, `survey.ts`
- Config files: `drizzle.config.ts`, `next.config.ts`, `eslint.config.mjs`

**Functions:**
- Async data functions: camelCase verb+noun, e.g., `createParticipant`, `getSession`, `saveRevision`, `updateSessionStatus`
- React component handlers: `handle` prefix, e.g., `handleSend`, `handleSubmit`, `handleDelete`, `handleSurveyComplete`
- Helper/utility functions: camelCase verb+noun, e.g., `shuffledSampleOrder`, `pickGroupRoundRobin`, `computeDiff`, `formatDate`, `sanitizeLatex`
- Exported constants: UPPER_SNAKE_CASE for static data, e.g., `ADVISORY_SYSTEM_PROMPT`, `SURVEY_QUESTIONS`, `WRITING_SAMPLES`, `GROUP_FILTERS`

**Variables:**
- camelCase throughout: `sessionId`, `participantId`, `sampleOrder`, `promptNumber`
- Boolean state variables: present-tense adjective, e.g., `isStreaming`, `saving`, `advancing`, `submitting`, `loading`
- Record/lookup maps: noun + `Map` suffix, e.g., `sampleMap`, `surveyMap`

**Types / Interfaces:**
- PascalCase interfaces: `ChatPanelProps`, `SessionData`, `WritingEditorProps`, `DiffChange`, `ChatMessage`
- Type aliases: PascalCase, e.g., `Phase`, `SurveyQuestionId`
- Inline union types for constrained values: `type Phase = 'loading' | 'instructions' | 'editing' | 'survey' | 'completed' | 'error'`

**Database columns:**
- snake_case in Postgres (e.g., `session_id`, `sample_id`, `created_at`)
- Drizzle ORM field names: camelCase mapping to snake_case column (e.g., `participantId` → `participant_id`)

## Code Style

**Formatting:**
- No Prettier config detected — formatting is not enforced by a dedicated formatter
- Indentation: 2 spaces (consistent throughout `src/`)
- Single quotes for strings in TypeScript/TSX files
- Trailing commas in multi-line function calls and object literals (consistent)

**Linting:**
- ESLint with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config: `eslint.config.mjs`
- Run command: `npm run lint` (runs `eslint` with no flags — checks entire project)
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)

**TypeScript:**
- `strict: true` — null checks, type narrowing required
- `noEmit: true` — TypeScript is type-check only, Next.js handles compilation
- Path alias `@/*` maps to `src/*` — use `@/` for all internal imports
- `error: unknown` pattern in catch blocks (required by strict TS); always narrow with `error instanceof Error`

## Import Organization

**Order (observed pattern):**
1. Node built-ins: `import crypto from 'crypto'`
2. Next.js / framework: `import { NextRequest, NextResponse } from 'next/server'`
3. Third-party packages: `import { eq, and } from 'drizzle-orm'`
4. Internal `@/lib` modules: `import { db } from '@/lib/db'`
5. Internal `@/components`: `import ChatPanel from '@/components/ChatPanel'`
6. Types only (inline, not separated into a block)

**Path Aliases:**
- `@/*` resolves to `src/*`
- Use `@/lib/db/queries` not relative `../../lib/db/queries`
- Use `@/components/ChatPanel` not relative paths

**No barrel files** — each module is imported directly by path.

## Error Handling

**API Routes — uniform pattern:**
```typescript
// All API routes wrap entire handler in try/catch
try {
  // ... handler logic
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('[route-name] METHOD error:', message);
  return NextResponse.json(
    { error: `Descriptive message: ${message}` },
    { status: 500 },
  );
}
```

**HTTP Status Codes:**
- `400` — validation failures (missing fields, wrong types, invalid state)
- `404` — resource not found (session, participant, sample)
- `503` — external service unavailable (AI provider connection refused)
- `500` — unexpected server errors
- `201` — successful creation (revisions, registrations, submissions)

**Client-side error handling:**
- React components store error strings in `const [error, setError] = useState('')`
- Errors rendered inline in the component (never thrown, never surfaced to error boundaries)
- Empty catch blocks `catch { }` used when side-effect failures are intentional no-ops (e.g., fire-and-forget timing calls)
- `err instanceof Error && err.name === 'AbortError'` checked before treating as a real error in streaming code

**Database queries:**
- Functions return `rows[0] ?? undefined` (not null) when a single row is expected but may be absent
- No throws from query functions — callers receive `undefined` and check before proceeding

## Logging

**Framework:** `console.error` only (no logging library)

**Patterns:**
- API route errors: `console.error('[route-prefix] METHOD error:', message)` — uses bracketed route name tag
- DB failure during streaming: `console.error('Failed to save AI response to DB for prompt', promptRow.id)`
- No `console.log` or `console.warn` observed in production code paths

## Comments

**When to Comment:**
- Section dividers using Unicode box-drawing lines in query files: `// ─── Participants ───────────────────`
- JSDoc on non-obvious exported functions: `/** Compute a word-level diff between original and final text via LCS. */`
- Inline explanations for business logic: `// R016: session resume — return existing incomplete session`
- Idempotency notes: `// Idempotent: check if a timing record already exists`
- Intent clarification for empty catch: `// DB save failure after stream — log but don't crash`

**TSDoc:**
- Used sparingly on exported functions with non-obvious behavior (`getTotalSessionCount`, `computeDiff`, DELETE handler)
- Not used on React component props — interfaces are self-documenting

## Function Design

**Size:** Functions are generally single-responsibility. The largest functions (`getSessionDetail`, `getExportData`) are intentionally data-assembly queries with no extracted sub-functions — acceptable given the domain.

**Parameters:**
- Primitive parameters preferred over objects for small arities (2–3 params)
- Props interfaces defined inline above the component for clarity

**Return Values:**
- DB query functions: return first row or `undefined` (not null, not throwing)
- API handlers: always `NextResponse.json(...)` or `new Response(...)`
- Async generators used for streaming AI responses (`chatWithGemini`)

## React Patterns

**Client components:**
- All interactive components declare `'use client'` at the top
- Server components (pages that only fetch and render) do not declare `'use client'`
- Exception: all pages in `src/app/study/`, `src/app/researcher/`, `src/app/register/` are client components due to interactivity

**State management:**
- Local `useState` only — no global state library
- `useCallback` for event handlers that are passed as props or used in `useEffect` dependencies
- `useRef` for mutable values that should not trigger re-renders (`mountedRef`, `abortRef`, `editorTextRef`)
- `memo` used for expensive render-stable subcomponents (`MarkdownMessage`)

**Styling:**
- Inline styles exclusively — no CSS modules, no Tailwind utility classes in JSX
- Tailwind is installed but used only in `globals.css` via `@import "tailwindcss"`
- Design tokens as hardcoded hex values: `#1A1816` (near-black), `#F4F2ED` (cream), `#D4C17A` (gold accent)
- Responsive styles injected via `<style>{` tagged template literals inside components
- CSS class names on container divs for responsive override targeting (e.g., `study-editor-pane`, `survey-layout`)

**Props pattern:**
```typescript
interface ComponentNameProps {
  propName: type;
  optionalProp?: type;
  callbackProp: (data: DataType) => void;
}

export default function ComponentName({ prop1, prop2 }: ComponentNameProps) {
```

## Module Design

**Exports:**
- One default export per component file (the React component)
- Named exports for all library functions in `src/lib/db/queries.ts`
- Named `const` exports for static data: `SURVEY_QUESTIONS`, `ADVISORY_SYSTEM_PROMPT`, `WRITING_SAMPLES`

**Re-exports:**
- `src/lib/ollama.ts` re-exports from `src/lib/gemini.ts` to maintain stable import names after provider migration

**API route files:**
- Export named HTTP method functions: `export async function GET(...)`, `export async function POST(...)`, `export async function DELETE(...)`
- Each route file handles one resource, one or two HTTP methods maximum

---

*Convention analysis: 2026-04-02*

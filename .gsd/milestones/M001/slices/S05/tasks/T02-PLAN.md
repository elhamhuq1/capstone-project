---
estimated_steps: 6
estimated_files: 3
---

# T02: Build researcher dashboard pages

**Slice:** S05 — Researcher Dashboard + CSV Export
**Milestone:** M001

## Description

Build two client-side pages for the researcher dashboard: a session list page at `/researcher` with group filtering and an export button, and a session detail page at `/researcher/[sessionId]` showing complete per-sample data. These pages consume the three API routes created in T01. Use Tailwind CSS v4 classes matching the existing component style (no tailwind.config — Tailwind v4 with `@tailwindcss/postcss` plugin). Add a simple layout wrapper for consistent header/nav.

**Relevant skills:** `frontend-design` — for building polished, readable dashboard UI.

## Steps

1. **Create `src/app/researcher/layout.tsx`** — Simple layout with a header showing "Researcher Dashboard" title and a navigation bar with a link back to home (`/`) and a prominent "Export CSV" link/button pointing to `/api/researcher/export` (which triggers browser download). Use `'use client'` is not needed here — this can be a server component wrapping `{children}`.

2. **Create `src/app/researcher/page.tsx`** — Client component (`'use client'`). On mount, fetch `/api/researcher/sessions`. Display a table with columns: Participant Name, Email, Group, Status, Samples Completed, Started At. Above the table, add a group filter: 4 buttons — "All", "Single-Shot", "Iterative", "Scaffold". Active filter has a distinct visual style (filled vs outline). Clicking a filter re-fetches with `?group=` param (or fetches all for "All"). Each row is clickable/has a link to `/researcher/[sessionId]`. Show a loading state while fetching. Show "No sessions found" for empty results. Style with Tailwind: clean table layout, alternating row colors, rounded corners, padding.

3. **Create `src/app/researcher/[sessionId]/page.tsx`** — Client component (`'use client'`). On mount, fetch `/api/researcher/sessions/[sessionId]`. Display:
   - **Header section**: Participant name, email, group (with colored badge), session status, started/completed timestamps.
   - **Per-sample cards** (3 cards, one per sample in order): Each card shows sample title, sample index, timing (time spent in seconds), and expandable/collapsible sections for:
     - **Prompts & AI Responses**: Each prompt shown with its AI response below it, numbered. Prompt text in one style, AI response in another (e.g. indented or different background). Truncate long responses with expand/collapse.
     - **Revisions**: List of revision snapshots with revision number and timestamp. Content truncated with expand option.
     - **Survey Ratings**: 5 ratings displayed in a compact format (e.g. a small table or inline badges).
   - **Back link** to `/researcher`.
   - Handle 404 (session not found) with a clear message.

4. **Add "Export CSV" download link** — In the researcher list page (or layout), include an `<a href="/api/researcher/export" download>Export CSV</a>` link styled as a button. The `download` attribute combined with the Content-Disposition header from the API ensures the browser downloads the file.

5. **Handle loading and error states** — Both pages should show a loading spinner/text while fetching and an error message if the fetch fails. Use `useState` + `useEffect` pattern consistent with existing study page components.

6. **Verify with `npm run build`** — ensure all new pages type-check correctly.

## Must-Haves

- [ ] `/researcher` page renders a table of all sessions with name, email, group, status, samples completed, started time
- [ ] Group filter buttons (All / Single-Shot / Iterative / Scaffold) filter the session list
- [ ] Each session row links to `/researcher/[sessionId]` detail page
- [ ] `/researcher/[sessionId]` shows participant info, 3 sample cards with prompts/responses, revisions, survey ratings, timing
- [ ] Export CSV button/link triggers download from `/api/researcher/export`
- [ ] Loading and error states handled on both pages
- [ ] `npm run build` passes

## Verification

- `npm run build` exits 0
- Navigate to `http://localhost:3000/researcher` in browser — session list renders
- Click group filter buttons — table filters correctly
- Click a session row — detail page renders with all sample data
- Click "Export CSV" — browser downloads a `.csv` file

## Inputs

- T01 API routes:
  - `GET /api/researcher/sessions` → JSON array of `{ sessionId, participantName, participantEmail, group, status, samplesCompleted, totalPrompts, totalTimeSeconds, startedAt, completedAt }`
  - `GET /api/researcher/sessions/[sessionId]` → JSON object with participant info and per-sample arrays of prompts, revisions, surveys, timings
  - `GET /api/researcher/export` → CSV file download
- Existing component patterns in `src/components/` for Tailwind styling reference
- Tailwind CSS v4 — use utility classes directly, no config file

## Observability Impact

- **No new runtime signals** — these are read-only dashboard pages consuming existing API routes
- **Browser inspection:** Navigate to `/researcher` to see session list; click any row to see detail page with all per-sample data
- **Error visibility:** Loading failures show inline error banners; 404 sessions show "Session not found" message with back link
- **Export visibility:** The Export CSV button in the header links to `/api/researcher/export` which triggers a browser download

## Expected Output

- `src/app/researcher/layout.tsx` — layout with header and export link
- `src/app/researcher/page.tsx` — session list with group filter table
- `src/app/researcher/[sessionId]/page.tsx` — session detail with per-sample cards

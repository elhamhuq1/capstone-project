---
id: T02
parent: S05
milestone: M001
provides:
  - /researcher session list page with group filtering
  - /researcher/[sessionId] session detail page with per-sample cards
  - Researcher layout with header and Export CSV download link
key_files:
  - src/app/researcher/layout.tsx
  - src/app/researcher/page.tsx
  - src/app/researcher/[sessionId]/page.tsx
key_decisions:
  - Used collapsible sections for prompts/revisions/survey to avoid overwhelming detail view
  - Used stone/zinc color palette consistent with existing app components
  - Made layout a server component; list and detail pages are client components using useState+useEffect fetch pattern
patterns_established:
  - Researcher pages use GET fetch to /api/researcher/* routes with loading/error/empty states
  - Group filter badges use consistent color mapping (amber=single-shot, sky=iterative, violet=scaffold)
  - TruncatedText component pattern for long content with expand/collapse
observability_surfaces:
  - Browser: /researcher shows all sessions in filterable table
  - Browser: /researcher/[id] shows full session detail with prompts, revisions, survey, timing
  - Browser: 404 page shown for invalid session IDs with back link
  - Header: Export CSV button triggers download from /api/researcher/export
duration: 12m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Build researcher dashboard pages

**Built researcher dashboard with session list page (group filtering, session table) and detail page (per-sample cards with collapsible prompts, revisions, survey ratings, timing)**

## What Happened

Created 3 files for the researcher dashboard:

1. **`src/app/researcher/layout.tsx`** — Server component layout with sticky header showing "Researcher Dashboard" title, Home link, and an Export CSV download button (`<a href="/api/researcher/export" download>`) styled in emerald green with a download icon.

2. **`src/app/researcher/page.tsx`** — Client component session list page. Fetches `/api/researcher/sessions` on mount. Features:
   - Group filter bar with 4 buttons (All, Single-Shot, Iterative, Scaffold) — active filter shown as filled button, others as outlined. Re-fetches with `?group=` param on click.
   - Session table with columns: Participant Name (linked to detail), Email, Group (colored badge), Status (colored badge), Samples (X/3), Started At.
   - Alternating row colors, hover highlight, summary footer showing total count.
   - Loading spinner, error banner, and "No sessions found" empty state.

3. **`src/app/researcher/[sessionId]/page.tsx`** — Client component detail page. Fetches `/api/researcher/sessions/[sessionId]`. Features:
   - Header card with participant name, email, group badge, status badge, start/completion timestamps.
   - Per-sample cards (one per sample) showing: sample title, index, timing duration.
   - Collapsible sections inside each card:
     - **Prompts & AI Responses**: Prompt text in blue background, AI response in green with border-left accent. Uses TruncatedText component.
     - **Revisions**: Numbered revision snapshots with timestamps. Content truncated with expand option.
     - **Survey Ratings**: 5 ratings as inline badges (Ownership, Satisfaction, Cognitive Load, Helpfulness, Future Intent).
   - 404 handling with "Session not found" message and back link.
   - Back link to `/researcher` at top.

## Verification

- `npm run build` exits 0 — all 3 new pages in route table (researcher, researcher/[sessionId]) ✅
- Browser: `/researcher` renders table with 10 sessions showing name, email, group, status, samples, started ✅
- Browser: "Single-Shot" filter shows 3 sessions, "All" restores 10 ✅
- Browser: Clicking session name navigates to `/researcher/[sessionId]` detail page ✅
- Browser: Detail page shows participant info, group/status badges, 3 sample cards ✅
- Browser: Expanding "Revisions" shows Rev #1 with content and timestamp ✅
- Browser: Expanding "Survey Ratings" shows all 5 ratings with numeric values (e.g. Ownership 4, Satisfaction 3) ✅
- Browser: `/researcher/nonexistent-id` shows "Session not found" 404 page ✅
- `curl -I /api/researcher/export` returns content-type: text/csv and content-disposition: attachment ✅

## Diagnostics

- **Session list:** Navigate to `/researcher` — shows all sessions in filterable table
- **Session detail:** Navigate to `/researcher/{sessionId}` — shows full per-sample breakdown
- **404 handling:** Navigate to `/researcher/bad-id` — shows "Session not found" with back link
- **Export:** Click "Export CSV" button in header — triggers CSV download
- **Empty state:** Apply group filter that matches no sessions — shows "No sessions found" message

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/app/researcher/layout.tsx` — Server component layout with header, nav, and Export CSV download link
- `src/app/researcher/page.tsx` — Client component session list page with group filter buttons and session table
- `src/app/researcher/[sessionId]/page.tsx` — Client component session detail page with per-sample cards, collapsible sections for prompts/revisions/survey

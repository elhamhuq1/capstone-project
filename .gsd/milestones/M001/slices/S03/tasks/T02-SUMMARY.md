---
id: T02
parent: S03
milestone: M001
provides:
  - ChatPanel component with streaming AI responses, multi-turn conversation, and single-shot enforcement
  - ScaffoldPanel component with collapsible numbered prompt engineering tips
key_files:
  - src/components/ChatPanel.tsx
  - src/components/ScaffoldPanel.tsx
key_decisions:
  - promptCount initialized from initialMessages user-message count for correct resume behavior
  - mountedRef pattern used alongside AbortController to prevent React state updates after unmount
patterns_established:
  - Streaming chat pattern: fetch → getReader → TextDecoder → accumulate chunks into growing assistant message in messages array
  - Single-shot enforcement: promptCount state + isSingleShotExhausted derived boolean gates input
  - Collapsible panel pattern: useState(true) + aria-expanded + conditional rendering
observability_surfaces:
  - ChatPanel shows inline error messages for fetch failures (no console-only errors)
  - isStreaming state + "Responding…" indicator visible during active streams
  - Single-shot exhaustion message visible when enforcement activates
duration: 8m
verification_result: passed
completed_at: 2026-03-17T19:56:00-04:00
blocker_discovered: false
---

# T02: Build ChatPanel and ScaffoldPanel components

**Built streaming ChatPanel with single-shot/iterative mode enforcement and collapsible ScaffoldPanel with 6 prompt engineering tips**

## What Happened

Built two self-contained client components:

**ChatPanel** (`src/components/ChatPanel.tsx`): Full streaming chat component that POSTs to `/api/session/{sessionId}/prompt` with `{ content, sampleId }`. Uses getReader + TextDecoder pattern from test-chat page. Manages `messages` state array with optimistic user message insertion and growing assistant message during streaming. Single-shot enforcement disables input when `promptCount >= 1` with amber notice. AbortController stored in ref, aborted on unmount via useEffect cleanup. mountedRef prevents state updates after unmount. Auto-scrolls message container on new content. Enter submits (Shift+Enter for newline). Props accept `initialMessages` for session resume.

**ScaffoldPanel** (`src/components/ScaffoldPanel.tsx`): Static collapsible card with 6 numbered prompt engineering tips. Uses emerald-tinted number badges matching InstructionsScreen's design language. Button header with aria-expanded toggles visibility. Default expanded.

Both components use stone/zinc Tailwind colors with dark mode support, rounded-xl borders, and shadow-sm — consistent with WritingEditor and InstructionsScreen.

## Verification

- `npm run build` exits 0 — both components compile without TypeScript errors
- Code review: ChatPanel has `promptCount` state initialized from `initialMessages.filter(m => m.role === 'user').length`
- Code review: `isSingleShotExhausted = group === 'single-shot' && promptCount >= 1` disables textarea and send button
- Code review: AbortController created per request, stored in `abortRef`, cleaned up in useEffect return
- Code review: `mountedRef` checked before all state updates in async paths
- Code review: `initialMessages` passed to `useState<Message[]>` for session resume rendering
- Code review: ScaffoldPanel has 6 numbered tips with collapsible wrapper using `isExpanded` state
- Slice verification (`scripts/verify-s03.sh`): 4 passed, 0 failed, 2 skipped (server-dependent checks expected to pass after T03 integration)

## Diagnostics

- ChatPanel runtime: errors displayed inline in chat area (red border card). Network errors, non-200 status, and missing response body all surfaced to user.
- React DevTools: inspect `messages`, `promptCount`, `isStreaming`, `input`, `error` state on ChatPanel instance
- Browser Network tab: observe POST to `/api/session/{sessionId}/prompt` with streaming response chunks
- ScaffoldPanel: pure static — inspect `isExpanded` state for collapse toggle

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/components/ChatPanel.tsx` — streaming chat component with mode enforcement, AbortController cleanup, session resume via initialMessages
- `src/components/ScaffoldPanel.tsx` — collapsible prompt engineering tips panel with 6 numbered tips
- `.gsd/milestones/M001/slices/S03/tasks/T02-PLAN.md` — added Observability Impact section (pre-flight fix)

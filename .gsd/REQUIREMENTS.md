# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R001 — Participant registration with name/email
- Class: primary-user-loop
- Status: validated
- Description: Participants enter their name and email to begin the study. No passwords or accounts.
- Why it matters: Identifies participants for data analysis and allows researchers to correlate results.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: POST /api/register creates participant and session; RegistrationForm UI collects name/email and redirects to study page; verify-s02.sh check #1
- Notes: Email used as unique identifier (lowercase-normalized). Simple form, no verification.

### R002 — Random group assignment
- Class: core-capability
- Status: validated
- Description: The app randomly assigns each participant to one of three groups: single-shot, iterative, or scaffold. Participants cannot choose their group.
- Why it matters: Eliminates self-selection bias — proper experimental design requires random assignment so different personality types don't cluster in the easiest group.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: Balanced assignment (min-count with random tie-breaking) verified; 3 registrations produce 3 different groups; getGroupCounts() confirms distribution; verify-s02.sh check #11
- Notes: Assignment is balanced — roughly equal numbers per group via min-count algorithm.

### R003 — Writing sample presentation (3 samples, randomized order)
- Class: primary-user-loop
- Status: validated
- Description: Each participant is presented with 3 flawed writing samples sequentially. Sample order is randomized per participant to prevent ordering effects.
- Why it matters: Randomized ordering eliminates confound where participants improve simply through practice across the fixed sequence.
- Source: user, inferred
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: 3 seeded samples presented sequentially; Fisher-Yates shuffle produces different sampleOrder per participant; verify-s02.sh confirms advancement through all 3; browser walkthrough confirms UI progression
- Notes: Samples scored 54, 64, 75 by Grammarly. ~500 words each.

### R004 — In-place text editor with revision history
- Class: core-capability
- Status: validated
- Description: Participants edit the writing sample directly in a text editor. The editor tracks revision history as snapshots so participants can view past versions and researchers can analyze the editing process.
- Why it matters: Revision history is central to measuring suggestion acceptance rate — researchers can see which AI suggestions were actually incorporated.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S04
- Validation: WritingEditor with textarea, explicit save, revision history sidebar with click-to-view verified via browser walkthrough and verify-s02.sh; S04 adds per-sample timing (started_at/completed_at) completing the data logging loop; verify-s04.sh full flow confirms revisions + timing persist correctly
- Notes: Google Docs-lite feel. Full-text snapshots, not character-level tracking.

### R005 — AI chat panel with advisory system prompt
- Class: core-capability
- Status: validated
- Description: An AI chat panel powered by Ollama/Llama 3 8B. The AI is system-prompted to be advisory by default — it gives guidance, explains issues, suggests approaches, but does not volunteer ready-to-paste corrected sentences unless the participant explicitly asks.
- Why it matters: The advisory-by-default behavior is the core experimental design — participants who figure out they can ask for direct text demonstrate prompt sophistication.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S01
- Validation: S03: ChatPanel streams advisory AI responses from Ollama/Llama 3 8B; ADVISORY_SYSTEM_PROMPT injected with writing sample context in prompt route; streaming display verified via build + API tests + browser walkthrough; verify-s03.sh checks 2-5
- Notes: System prompt design is critical. The AI should feel helpful but not do the work for the participant by default.

### R006 — Single-shot mode enforces one-prompt limit
- Class: core-capability
- Status: validated
- Description: In single-shot mode, the participant gets exactly one prompt per writing sample. After submitting, the prompt input is disabled.
- Why it matters: Establishes baseline — measures what one interaction with AI can achieve without iteration.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: S03: ChatPanel disables input after promptCount >= 1 for single-shot group; amber notice displayed; enforcement persists on page reload (promptCount initialized from initialMessages); verified via browser walkthrough
- Notes: Participant still has unlimited time to edit the sample after seeing the AI response.

### R007 — Iterative mode allows unlimited prompts
- Class: core-capability
- Status: validated
- Description: In iterative mode, the participant can prompt the AI unlimited times per writing sample, building a multi-turn conversation.
- Why it matters: Tests whether iterative refinement of prompts yields meaningfully better revision outcomes — the effort/utility tradeoff.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: S03: No prompt limit for iterative group; multi-turn conversation context carried across prompts (prior prompts/responses included in chatWithOllama call); verified via code review + verify-s03.sh prompt numbering check
- Notes: Multi-turn conversation — context carries across prompts within one sample.

### R008 — Scaffold mode with prompt engineering instruction panel
- Class: core-capability
- Status: validated
- Description: Same as iterative (unlimited prompts), but a static instructional panel with prompt engineering tips is displayed alongside the chat panel.
- Why it matters: Tests whether explicit instruction changes prompting behavior and outcomes versus learning through practice (iterative mode).
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: S03: ScaffoldPanel with 6 numbered prompt engineering tips renders above ChatPanel for scaffold group only; collapsible via button with aria-expanded; unlimited prompting same as iterative; verified via browser walkthrough
- Notes: Static panel — collapsible, always available. Content authored by the research team.

### R009 — Post-sample Likert survey
- Class: primary-user-loop
- Status: validated
- Description: After submitting their final revision for each writing sample, participants complete a short Likert-scale survey covering perceived authorship, satisfaction with the process, and cognitive load.
- Why it matters: Captures the qualitative experience dimension — the "cost" side of the effort/utility tradeoff.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: S04: SurveyForm renders 5 Likert questions (authorship, satisfaction, cognitive_load, helpfulness, future_intent) with clickable 1-5 scale; POST /survey validates questionId and rating 1-5; survey appears between editing and sample advancement; 15 survey rows verified across full 3-sample flow; verify-s04.sh checks 2, 5-6, 10
- Notes: Survey appears between samples. Keep it short to avoid survey fatigue across 3 samples.

### R010 — Full data logging
- Class: core-capability
- Status: validated
- Description: The app logs all research data: every prompt sent, every AI response, every revision snapshot, timestamps throughout, prompt length, time spent per sample, and enough detail to compute suggestion acceptance rate.
- Why it matters: The study's quantitative analysis depends on granular interaction data — this is the research instrument.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S04
- Validation: S02: revision snapshots + timestamps; S03: every prompt and AI response persisted in prompts/ai_responses tables with timestamps and promptNumber; S04: survey responses (5 per sample), per-sample timing (started_at/completed_at); full 3-sample flow verified with 15 survey rows + 3 timing records; all research data now captured in SQLite
- Notes: Timestamps on all events. Revision snapshots taken on meaningful edit pauses or explicit saves.

### R011 — Researcher dashboard
- Class: core-capability
- Status: validated
- Description: An admin-facing page where researchers can browse all participant sessions, view prompt/response history, revision diffs, survey answers, and filter by group.
- Why it matters: Researchers need to review and understand the data before analysis — not just export raw numbers.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: none
- Validation: S05: /researcher page lists all sessions in filterable table (group filter buttons); /researcher/[sessionId] shows per-sample detail with collapsible prompts, AI responses, revisions, survey ratings, timing; GET /api/researcher/sessions and /api/researcher/sessions/[id] return structured JSON; verify-s05.sh checks 1-6
- Notes: Read-only view. No participant-facing access.

### R012 — CSV export of all study data
- Class: core-capability
- Status: validated
- Description: Researchers can export all study data to CSV for analysis in Excel, R, Python, etc.
- Why it matters: CSV is the universal interchange format for research data analysis.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: none
- Validation: S05: GET /api/researcher/export returns CSV with Content-Type text/csv and Content-Disposition attachment; 18 columns (participant_name, participant_email, group, sample_id, sample_title, sample_index, prompt_count, total_prompt_chars, revision_count, time_seconds, survey_authorship, survey_satisfaction, survey_cognitive_load, survey_helpfulness, survey_future_intent, session_status, session_started_at, session_completed_at); proper field escaping; verify-s05.sh checks 7-11
- Notes: Export should include participant info, group, all prompts, responses, revision history, survey answers, timestamps, computed metrics.

### R013 — Completion screen
- Class: primary-user-loop
- Status: validated
- Description: After completing all 3 writing samples and surveys, participants see a thank-you/completion screen.
- Why it matters: Clean ending to the study session — participants know they're done.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: S04: CompletionScreen renders green checkmark, thank-you heading, "3 writing samples completed" summary, session ID in mono-font box, and "Return to Home" link; verified by browser walkthrough and automated flow completion check in verify-s04.sh
- Notes: Simple. May include a participant ID for their records.

### R014 — Sample order randomization per participant
- Class: quality-attribute
- Status: validated
- Description: Writing sample order is randomized for each participant to prevent ordering/learning effects from confounding results.
- Why it matters: If all participants see samples in the same order (easy → hard), improvement across samples could be attributed to practice rather than the experimental condition.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: Fisher-Yates shuffle generates different sampleOrder arrays across registrations; JSON stored in sessions table; verify-s02.sh confirms sample progression follows stored order
- Notes: Standard practice in within-subjects experimental design.

### R015 — Pre-study instructions screen
- Class: launchability
- Status: validated
- Description: Before the first writing sample, participants see a screen explaining the task — what they'll be doing, how the AI chat works, and what's expected.
- Why it matters: Participants need to understand the task without researcher intervention — especially important for consistent study conditions.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: InstructionsScreen renders group-specific content; scaffold group omits prompt engineering tips; browser walkthrough confirms instructions appear before editing
- Notes: Group-specific — scaffold group does not see prompt engineering tips here (those are in the scaffold panel during the task).

### R016 — Session persistence
- Class: continuity
- Status: validated
- Description: If a participant's browser closes mid-study, they can resume from where they left off by re-entering their email.
- Why it matters: Losing a participant's data mid-study wastes their time and a study slot.
- Source: research
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: Same email returns same sessionId (HTTP 200 resume); study page loads at correct phase (skips instructions if already begun); verify-s02.sh check #2
- Notes: Practical insurance for in-person study sessions. Data is server-side in SQLite, so recovery is straightforward.

## Validated

### R001 — Participant registration with name/email
(See entry above — moved to validated status)

### R002 — Random group assignment
(See entry above — moved to validated status)

### R003 — Writing sample presentation (3 samples, randomized order)
(See entry above — moved to validated status)

### R004 — In-place text editor with revision history
(See entry above — moved to validated status)

### R005 — AI chat panel with advisory system prompt
(See entry above — moved to validated status)

### R006 — Single-shot mode enforces one-prompt limit
(See entry above — moved to validated status)

### R007 — Iterative mode allows unlimited prompts
(See entry above — moved to validated status)

### R008 — Scaffold mode with prompt engineering instruction panel
(See entry above — moved to validated status)

### R009 — Post-sample Likert survey
(See entry above — moved to validated status)

### R010 — Full data logging
(See entry above — moved to validated status)

### R013 — Completion screen
(See entry above — moved to validated status)

### R014 — Sample order randomization per participant
(See entry above — moved to validated status)

### R015 — Pre-study instructions screen
(See entry above — moved to validated status)

### R016 — Session persistence
(See entry above — moved to validated status)

### R011 — Researcher dashboard
(See entry above — moved to validated status)

### R012 — CSV export of all study data
(See entry above — moved to validated status)

## Deferred

### R017 — Automated Grammarly scoring integration
- Class: integration
- Status: deferred
- Description: Programmatic scoring of revised writing samples via Grammarly's Writing Score API.
- Why it matters: Would automate the scoring step, but Grammarly's API requires Enterprise/Education plans.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Manual scoring is the current plan — researchers paste each revision into Grammarly post-study.

## Out of Scope

### R018 — Cloud deployment / remote access
- Class: constraint
- Status: out-of-scope
- Description: The app runs on localhost only. No cloud hosting, no remote participant access.
- Why it matters: Prevents scope creep into deployment, DNS, SSL, etc. Study sessions are in-person.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Participants connect during supervised study sessions on local network.

### R019 — Participant authentication
- Class: constraint
- Status: out-of-scope
- Description: No passwords, no accounts, no login system. Simple name/email entry only.
- Why it matters: Removes auth complexity. Participants are supervised in-person — no security risk.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Email serves as unique identifier for session persistence.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | primary-user-loop | validated | M001/S02 | none | S02: POST /api/register + RegistrationForm + verify-s02.sh |
| R002 | core-capability | validated | M001/S02 | none | S02: balanced min-count assignment + verify-s02.sh |
| R003 | primary-user-loop | validated | M001/S02 | none | S02: 3 seeded samples + Fisher-Yates + progression + verify-s02.sh |
| R004 | core-capability | validated | M001/S02 | M001/S04 | S02: WritingEditor + revisions API; S04: per-sample timing completes data logging |
| R005 | core-capability | validated | M001/S03 | M001/S01 | S03: ChatPanel + ADVISORY_SYSTEM_PROMPT + streaming + verify-s03.sh |
| R006 | core-capability | validated | M001/S03 | none | S03: single-shot enforcement + amber notice + resume persistence |
| R007 | core-capability | validated | M001/S03 | none | S03: unlimited prompts + multi-turn context + verify-s03.sh |
| R008 | core-capability | validated | M001/S03 | none | S03: ScaffoldPanel + 6 tips + collapsible + browser walkthrough |
| R009 | primary-user-loop | validated | M001/S04 | none | S04: SurveyForm + POST /survey + validation + verify-s04.sh |
| R010 | core-capability | validated | M001/S02 | M001/S03, M001/S04 | S02: revisions; S03: prompts/responses; S04: survey + timing; all data captured |
| R011 | core-capability | validated | M001/S05 | none | S05: /researcher page + /api/researcher/sessions + verify-s05.sh checks 1-6 |
| R012 | core-capability | validated | M001/S05 | none | S05: /api/researcher/export CSV + verify-s05.sh checks 7-11 |
| R013 | primary-user-loop | validated | M001/S04 | none | S04: CompletionScreen + session ID + verify-s04.sh flow check |
| R014 | quality-attribute | validated | M001/S02 | none | S02: Fisher-Yates shuffle + JSON sampleOrder verified |
| R015 | launchability | validated | M001/S02 | none | S02: InstructionsScreen with group-specific content verified |
| R016 | continuity | validated | M001/S02 | none | S02: same email returns same sessionId + correct phase resume |
| R017 | integration | deferred | none | none | unmapped |
| R018 | constraint | out-of-scope | none | none | n/a |
| R019 | constraint | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 0
- Mapped to slices: 0
- Validated: 16 (R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R012, R013, R014, R015, R016)
- Unmapped active requirements: 0

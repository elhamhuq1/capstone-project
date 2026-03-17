# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R001 — Participant registration with name/email
- Class: primary-user-loop
- Status: active
- Description: Participants enter their name and email to begin the study. No passwords or accounts.
- Why it matters: Identifies participants for data analysis and allows researchers to correlate results.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Email used as unique identifier. Simple form, no verification.

### R002 — Random group assignment
- Class: core-capability
- Status: active
- Description: The app randomly assigns each participant to one of three groups: single-shot, iterative, or scaffold. Participants cannot choose their group.
- Why it matters: Eliminates self-selection bias — proper experimental design requires random assignment so different personality types don't cluster in the easiest group.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Assignment must be balanced — roughly equal numbers per group.

### R003 — Writing sample presentation (3 samples, randomized order)
- Class: primary-user-loop
- Status: active
- Description: Each participant is presented with 3 flawed writing samples sequentially. Sample order is randomized per participant to prevent ordering effects.
- Why it matters: Randomized ordering eliminates confound where participants improve simply through practice across the fixed sequence.
- Source: user, inferred
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Existing samples scored 54, 64, 75 by Grammarly. ~500 words each.

### R004 — In-place text editor with revision history
- Class: core-capability
- Status: active
- Description: Participants edit the writing sample directly in a text editor. The editor tracks revision history as snapshots so participants can view past versions and researchers can analyze the editing process.
- Why it matters: Revision history is central to measuring suggestion acceptance rate — researchers can see which AI suggestions were actually incorporated.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S04
- Validation: unmapped
- Notes: Google Docs-lite feel. Snapshots, not character-level tracking.

### R005 — AI chat panel with advisory system prompt
- Class: core-capability
- Status: active
- Description: An AI chat panel powered by Ollama/Llama 3 8B. The AI is system-prompted to be advisory by default — it gives guidance, explains issues, suggests approaches, but does not volunteer ready-to-paste corrected sentences unless the participant explicitly asks.
- Why it matters: The advisory-by-default behavior is the core experimental design — participants who figure out they can ask for direct text demonstrate prompt sophistication.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S01
- Validation: unmapped
- Notes: System prompt design is critical. The AI should feel helpful but not do the work for the participant by default.

### R006 — Single-shot mode enforces one-prompt limit
- Class: core-capability
- Status: active
- Description: In single-shot mode, the participant gets exactly one prompt per writing sample. After submitting, the prompt input is disabled.
- Why it matters: Establishes baseline — measures what one interaction with AI can achieve without iteration.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Participant still has unlimited time to edit the sample after seeing the AI response.

### R007 — Iterative mode allows unlimited prompts
- Class: core-capability
- Status: active
- Description: In iterative mode, the participant can prompt the AI unlimited times per writing sample, building a multi-turn conversation.
- Why it matters: Tests whether iterative refinement of prompts yields meaningfully better revision outcomes — the effort/utility tradeoff.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Multi-turn conversation — context carries across prompts within one sample.

### R008 — Scaffold mode with prompt engineering instruction panel
- Class: core-capability
- Status: active
- Description: Same as iterative (unlimited prompts), but a static instructional panel with prompt engineering tips is displayed alongside the chat panel.
- Why it matters: Tests whether explicit instruction changes prompting behavior and outcomes versus learning through practice (iterative mode).
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Static panel — collapsible, always available. Content authored by the research team.

### R009 — Post-sample Likert survey
- Class: primary-user-loop
- Status: active
- Description: After submitting their final revision for each writing sample, participants complete a short Likert-scale survey covering perceived authorship, satisfaction with the process, and cognitive load.
- Why it matters: Captures the qualitative experience dimension — the "cost" side of the effort/utility tradeoff.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Survey appears between samples. Keep it short to avoid survey fatigue across 3 samples.

### R010 — Full data logging
- Class: core-capability
- Status: active
- Description: The app logs all research data: every prompt sent, every AI response, every revision snapshot, timestamps throughout, prompt length, time spent per sample, and enough detail to compute suggestion acceptance rate.
- Why it matters: The study's quantitative analysis depends on granular interaction data — this is the research instrument.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S04
- Validation: unmapped
- Notes: Timestamps on all events. Revision snapshots taken on meaningful edit pauses or explicit saves.

### R011 — Researcher dashboard
- Class: core-capability
- Status: active
- Description: An admin-facing page where researchers can browse all participant sessions, view prompt/response history, revision diffs, survey answers, and filter by group.
- Why it matters: Researchers need to review and understand the data before analysis — not just export raw numbers.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Read-only view. No participant-facing access.

### R012 — CSV export of all study data
- Class: core-capability
- Status: active
- Description: Researchers can export all study data to CSV for analysis in Excel, R, Python, etc.
- Why it matters: CSV is the universal interchange format for research data analysis.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Export should include participant info, group, all prompts, responses, revision history, survey answers, timestamps, computed metrics.

### R013 — Completion screen
- Class: primary-user-loop
- Status: active
- Description: After completing all 3 writing samples and surveys, participants see a thank-you/completion screen.
- Why it matters: Clean ending to the study session — participants know they're done.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Simple. May include a participant ID for their records.

### R014 — Sample order randomization per participant
- Class: quality-attribute
- Status: active
- Description: Writing sample order is randomized for each participant to prevent ordering/learning effects from confounding results.
- Why it matters: If all participants see samples in the same order (easy → hard), improvement across samples could be attributed to practice rather than the experimental condition.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Standard practice in within-subjects experimental design.

### R015 — Pre-study instructions screen
- Class: launchability
- Status: active
- Description: Before the first writing sample, participants see a screen explaining the task — what they'll be doing, how the AI chat works, and what's expected.
- Why it matters: Participants need to understand the task without researcher intervention — especially important for consistent study conditions.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Group-specific — scaffold group should not see prompt engineering tips here (those are in the scaffold panel during the task).

### R016 — Session persistence
- Class: continuity
- Status: active
- Description: If a participant's browser closes mid-study, they can resume from where they left off by re-entering their email.
- Why it matters: Losing a participant's data mid-study wastes their time and a study slot.
- Source: research
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Practical insurance for in-person study sessions. Data is server-side in SQLite, so recovery is straightforward.

## Validated

(none yet)

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
| R001 | primary-user-loop | active | M001/S02 | none | unmapped |
| R002 | core-capability | active | M001/S02 | none | unmapped |
| R003 | primary-user-loop | active | M001/S02 | none | unmapped |
| R004 | core-capability | active | M001/S02 | M001/S04 | unmapped |
| R005 | core-capability | active | M001/S03 | M001/S01 | unmapped |
| R006 | core-capability | active | M001/S03 | none | unmapped |
| R007 | core-capability | active | M001/S03 | none | unmapped |
| R008 | core-capability | active | M001/S03 | none | unmapped |
| R009 | primary-user-loop | active | M001/S04 | none | unmapped |
| R010 | core-capability | active | M001/S02 | M001/S03, M001/S04 | unmapped |
| R011 | core-capability | active | M001/S05 | none | unmapped |
| R012 | core-capability | active | M001/S05 | none | unmapped |
| R013 | primary-user-loop | active | M001/S04 | none | unmapped |
| R014 | quality-attribute | active | M001/S02 | none | unmapped |
| R015 | launchability | active | M001/S02 | none | unmapped |
| R016 | continuity | active | M001/S02 | none | unmapped |
| R017 | integration | deferred | none | none | unmapped |
| R018 | constraint | out-of-scope | none | none | n/a |
| R019 | constraint | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 16
- Mapped to slices: 16
- Validated: 0
- Unmapped active requirements: 0

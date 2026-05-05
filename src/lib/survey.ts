// ─── Per-Task Survey (11 items) ─────────────────────────────────
// Shown after each writing sample submission.
// Sources:
//   - Calibration: custom (RQ1 — metacognitive miscalibration)
//   - Ownership: adapted from Joshi & Vogel (CUI 2025), originally
//     4-item scale (Personal Ownership, Responsibility, Personal
//     Connection, Emotional Connection), extended to 7 items for
//     revision context (triple-attribution: original author + participant + AI)
//   - NASA-TLX subscales: Hart & Staveland (1988) — Mental Demand, Effort, Frustration

export type SurveyQuestionType = 'likert7' | 'likert5' | 'number_input';

export interface SurveyQuestion {
  id: string;
  text: string;
  type: SurveyQuestionType;
  /** Which validated instrument this comes from */
  source: string;
  /** Low anchor label (for likert) or input label (for number_input) */
  lowLabel?: string;
  /** High anchor label (for likert) */
  highLabel?: string;
  /** Placeholder text for number inputs */
  placeholder?: string;
}

// ── Calibration prediction (RQ1) ──
// "How many Grammarly points do you think improved?"
const CALIBRATION_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'calibration_prediction',
    text: 'How many Grammarly score points do you think the text improved because of your edits?',
    type: 'number_input',
    source: 'Custom (RQ1: Metacognitive Miscalibration)',
    placeholder: 'e.g. 5',
  },
];

// ── Psychological Ownership (7 items, Likert 1-7) ──
// Items 1-4 from Joshi & Vogel (2025) / Barki et al. (2008) / Pierce et al. (2003)
// Items 5-7 adapted for revision context (triple-attribution)
const OWNERSHIP_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'ownership_personal',
    text: 'I feel a high degree of personal ownership over this revised text.',
    type: 'likert7',
    source: 'Joshi & Vogel (2025) — Personal Ownership',
    lowLabel: 'Strongly disagree',
    highLabel: 'Strongly agree',
  },
  {
    id: 'ownership_responsibility',
    text: 'I feel personally responsible for the quality of this revision.',
    type: 'likert7',
    source: 'Joshi & Vogel (2025) — Responsibility',
    lowLabel: 'Strongly disagree',
    highLabel: 'Strongly agree',
  },
  {
    id: 'ownership_connection',
    text: 'I feel a personal connection to this revised text.',
    type: 'likert7',
    source: 'Joshi & Vogel (2025) — Personal Connection',
    lowLabel: 'Strongly disagree',
    highLabel: 'Strongly agree',
  },
  {
    id: 'ownership_emotional',
    text: 'I have an emotional connection to this revised text.',
    type: 'likert7',
    source: 'Joshi & Vogel (2025) — Emotional Connection',
    lowLabel: 'Strongly disagree',
    highLabel: 'Strongly agree',
  },
  {
    id: 'ownership_mine',
    text: 'I feel like this revised text is "mine."',
    type: 'likert7',
    source: 'Adapted for revision context',
    lowLabel: 'Strongly disagree',
    highLabel: 'Strongly agree',
  },
  {
    id: 'ownership_contribution',
    text: 'The improvements in this text are primarily due to my own effort.',
    type: 'likert7',
    source: 'Adapted for revision context — effort attribution',
    lowLabel: 'Strongly disagree',
    highLabel: 'Strongly agree',
  },
  {
    id: 'ownership_proud',
    text: 'I would be comfortable putting my name on this revised text.',
    type: 'likert7',
    source: 'Adapted for revision context — authorship comfort',
    lowLabel: 'Strongly disagree',
    highLabel: 'Strongly agree',
  },
];

// ── NASA-TLX subscales (3 items, Likert 1-7) ──
// Adapted from Hart & Staveland (1988) Raw TLX.
// Original uses 21-point scale; we use 7-point Likert for consistency
// and lower cognitive burden (standard in HCI survey batteries).
const NASA_TLX_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'tlx_mental_demand',
    text: 'How mentally demanding was the revision task?',
    type: 'likert7',
    source: 'NASA-TLX — Mental Demand (Hart & Staveland, 1988)',
    lowLabel: 'Very low',
    highLabel: 'Very high',
  },
  {
    id: 'tlx_effort',
    text: 'How hard did you have to work to accomplish your level of performance?',
    type: 'likert7',
    source: 'NASA-TLX — Effort (Hart & Staveland, 1988)',
    lowLabel: 'Very low',
    highLabel: 'Very high',
  },
  {
    id: 'tlx_frustration',
    text: 'How frustrated, stressed, or annoyed did you feel during the task?',
    type: 'likert7',
    source: 'NASA-TLX — Frustration (Hart & Staveland, 1988)',
    lowLabel: 'Very low',
    highLabel: 'Very high',
  },
];

/** All 11 per-task survey questions, in presentation order */
export const TASK_SURVEY_QUESTIONS: SurveyQuestion[] = [
  ...CALIBRATION_QUESTIONS,
  ...OWNERSHIP_QUESTIONS,
  ...NASA_TLX_QUESTIONS,
];

// ─── Pre/Post Writing Self-Efficacy (8 items) ───────────────────
// Adapted from the Self-Efficacy for Writing Scale (SEWS)
// by Bruning, Dempsey, Kauffman, McKim & Zumbrunn (2013).
// Original SEWS has 16-22 items across 3 factors (Ideation,
// Conventions, Self-Regulation). We select 8 items most relevant
// to revision tasks, balanced across the three factors.
// Scale: 1-7 Likert (adapted from original 0-100 continuous).

export const SELF_EFFICACY_QUESTIONS: SurveyQuestion[] = [
  // ── Ideation (3 items) ──
  {
    id: 'se_ideas',
    text: 'I can think of many ideas when writing.',
    type: 'likert7',
    source: 'SEWS — Ideation (Bruning et al., 2013)',
    lowLabel: 'Not at all confident',
    highLabel: 'Completely confident',
  },
  {
    id: 'se_organize',
    text: 'I can organize my writing well.',
    type: 'likert7',
    source: 'SEWS — Ideation (Bruning et al., 2013)',
    lowLabel: 'Not at all confident',
    highLabel: 'Completely confident',
  },
  {
    id: 'se_express',
    text: 'I can clearly express my ideas in writing.',
    type: 'likert7',
    source: 'SEWS — Ideation (Bruning et al., 2013)',
    lowLabel: 'Not at all confident',
    highLabel: 'Completely confident',
  },
  // ── Conventions (2 items) ──
  {
    id: 'se_grammar',
    text: 'I can write with correct grammar and punctuation.',
    type: 'likert7',
    source: 'SEWS — Conventions (Bruning et al., 2013)',
    lowLabel: 'Not at all confident',
    highLabel: 'Completely confident',
  },
  {
    id: 'se_structure',
    text: 'I can write well-structured sentences and paragraphs.',
    type: 'likert7',
    source: 'SEWS — Conventions (Bruning et al., 2013)',
    lowLabel: 'Not at all confident',
    highLabel: 'Completely confident',
  },
  // ── Self-Regulation (3 items) ──
  {
    id: 'se_revise',
    text: 'I can effectively revise a draft to improve its quality.',
    type: 'likert7',
    source: 'SEWS — Self-Regulation (Bruning et al., 2013)',
    lowLabel: 'Not at all confident',
    highLabel: 'Completely confident',
  },
  {
    id: 'se_focus',
    text: 'I can focus on my writing even when the task is difficult.',
    type: 'likert7',
    source: 'SEWS — Self-Regulation (Bruning et al., 2013)',
    lowLabel: 'Not at all confident',
    highLabel: 'Completely confident',
  },
  {
    id: 'se_identify_errors',
    text: 'I can identify errors and weaknesses in a piece of writing.',
    type: 'likert7',
    source: 'SEWS — Self-Regulation (Bruning et al., 2013)',
    lowLabel: 'Not at all confident',
    highLabel: 'Completely confident',
  },
];

// ─── Legacy export (for backward compat with existing survey API) ──
// The old 5-item scale is replaced by the 11-item per-task survey.
export const SURVEY_QUESTIONS = TASK_SURVEY_QUESTIONS;
export type SurveyQuestionId = string;

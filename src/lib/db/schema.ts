import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const participants = pgTable('participants', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  participantId: integer('participant_id').notNull(),
  groupAssignment: text('group_assignment').notNull(),
  sampleOrder: text('sample_order').notNull(),
  currentSampleIndex: integer('current_sample_index').default(0).notNull(),
  status: text('status').default('instructions').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const writingSamples = pgTable('writing_samples', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  grammarlyScore: integer('grammarly_score'),
});

export const revisions = pgTable('revisions', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  sampleId: integer('sample_id').notNull(),
  content: text('content').notNull(),
  revisionNumber: integer('revision_number').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const prompts = pgTable('prompts', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  sampleId: integer('sample_id').notNull(),
  content: text('content').notNull(),
  promptNumber: integer('prompt_number').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aiResponses = pgTable('ai_responses', {
  id: serial('id').primaryKey(),
  promptId: integer('prompt_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const surveyResponses = pgTable('survey_responses', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  sampleId: integer('sample_id').notNull(),
  questionId: text('question_id').notNull(),
  rating: integer('rating').notNull(),
  /** For number_input questions (e.g. calibration prediction) */
  numericValue: integer('numeric_value'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Pre-study and post-study self-efficacy survey responses */
export const prePostSurveyResponses = pgTable('pre_post_survey_responses', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  /** 'pre' or 'post' */
  phase: text('phase').notNull(),
  questionId: text('question_id').notNull(),
  rating: integer('rating').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sampleTimings = pgTable('sample_timings', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  sampleId: integer('sample_id').notNull(),
  sampleIndex: integer('sample_index').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const finalSubmissions = pgTable('final_submissions', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  sampleId: integer('sample_id').notNull(),
  originalContent: text('original_content').notNull(),
  finalContent: text('final_content').notNull(),
  changesJson: text('changes_json').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});

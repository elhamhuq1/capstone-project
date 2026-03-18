import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const participants = sqliteTable('participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  participantId: integer('participant_id').notNull(),
  groupAssignment: text('group_assignment').notNull(),
  sampleOrder: text('sample_order').notNull(),
  currentSampleIndex: integer('current_sample_index').default(0).notNull(),
  status: text('status').default('instructions').notNull(),
  startedAt: text('started_at').default(sql`(datetime('now'))`).notNull(),
  completedAt: text('completed_at'),
});

export const writingSamples = sqliteTable('writing_samples', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  grammarlyScore: integer('grammarly_score'),
});

export const revisions = sqliteTable('revisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  sampleId: integer('sample_id').notNull(),
  content: text('content').notNull(),
  revisionNumber: integer('revision_number').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const prompts = sqliteTable('prompts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  sampleId: integer('sample_id').notNull(),
  content: text('content').notNull(),
  promptNumber: integer('prompt_number').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const aiResponses = sqliteTable('ai_responses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  promptId: integer('prompt_id').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const surveyResponses = sqliteTable('survey_responses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  sampleId: integer('sample_id').notNull(),
  questionId: text('question_id').notNull(),
  rating: integer('rating').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const sampleTimings = sqliteTable('sample_timings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  sampleId: integer('sample_id').notNull(),
  sampleIndex: integer('sample_index').notNull(),
  startedAt: text('started_at').default(sql`(datetime('now'))`).notNull(),
  completedAt: text('completed_at'),
});

export const finalSubmissions = sqliteTable('final_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  sampleId: integer('sample_id').notNull(),
  originalContent: text('original_content').notNull(),
  finalContent: text('final_content').notNull(),
  changesJson: text('changes_json').notNull(),
  submittedAt: text('submitted_at').default(sql`(datetime('now'))`).notNull(),
});

import crypto from 'crypto';
import { eq, and, sql, count, desc, sum } from 'drizzle-orm';
import { db } from './index';
import { participants, sessions, writingSamples, revisions, prompts, aiResponses, surveyResponses, prePostSurveyResponses, sampleTimings, finalSubmissions } from './schema';

// ─── Participants ───────────────────────────────────────────────

export async function createParticipant(name: string, email: string) {
  const rows = await db
    .insert(participants)
    .values({ name, email })
    .returning();
  return rows[0];
}

export async function findParticipantByEmail(email: string) {
  const rows = await db
    .select()
    .from(participants)
    .where(eq(participants.email, email));
  return rows[0] ?? undefined;
}

// ─── Sessions ───────────────────────────────────────────────────

export async function createSession(
  participantId: number,
  groupAssignment: string,
  sampleOrder: number[],
) {
  const id = crypto.randomUUID();
  const rows = await db
    .insert(sessions)
    .values({
      id,
      participantId,
      groupAssignment,
      sampleOrder: JSON.stringify(sampleOrder),
    })
    .returning();
  return rows[0];
}

export async function getSession(sessionId: string) {
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return rows[0] ?? undefined;
}

export async function getSessionWithCurrentSample(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) return undefined;

  const order: number[] = JSON.parse(session.sampleOrder);
  const currentSampleId = order[session.currentSampleIndex];

  if (currentSampleId === undefined) {
    return { session, sample: undefined };
  }

  const sampleRows = await db
    .select()
    .from(writingSamples)
    .where(eq(writingSamples.id, currentSampleId));

  return {
    session,
    sample: sampleRows[0] ?? undefined,
  };
}

// ─── Revisions ──────────────────────────────────────────────────

export async function saveRevision(
  sessionId: string,
  sampleId: number,
  content: string,
) {
  // Count existing revisions for this session+sample pair
  const countRows = await db
    .select({ value: count() })
    .from(revisions)
    .where(
      and(
        eq(revisions.sessionId, sessionId),
        eq(revisions.sampleId, sampleId),
      ),
    );
  const existingCount = countRows[0]?.value ?? 0;
  const revisionNumber = existingCount + 1;

  const rows = await db
    .insert(revisions)
    .values({
      sessionId,
      sampleId,
      content,
      revisionNumber,
    })
    .returning();
  return rows[0];
}

export async function getRevisions(sessionId: string, sampleId: number) {
  return db
    .select()
    .from(revisions)
    .where(
      and(
        eq(revisions.sessionId, sessionId),
        eq(revisions.sampleId, sampleId),
      ),
    )
    .orderBy(revisions.revisionNumber);
}

// ─── Sample Progression ─────────────────────────────────────────

export async function advanceSample(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) return undefined;

  const newIndex = session.currentSampleIndex + 1;

  if (newIndex >= 3) {
    // All samples completed — transition to post-survey phase
    const rows = await db
      .update(sessions)
      .set({
        currentSampleIndex: newIndex,
        status: 'post-survey',
      })
      .where(eq(sessions.id, sessionId))
      .returning();
    return rows[0];
  }

  const rows = await db
    .update(sessions)
    .set({ currentSampleIndex: newIndex })
    .where(eq(sessions.id, sessionId))
    .returning();
  return rows[0];
}

export async function updateSessionStatus(sessionId: string, status: string) {
  const rows = await db
    .update(sessions)
    .set({ status })
    .where(eq(sessions.id, sessionId))
    .returning();
  return rows[0] ?? undefined;
}

// ─── Group Assignment ───────────────────────────────────────────

export async function getGroupCounts() {
  const rows = await db
    .select({
      groupAssignment: sessions.groupAssignment,
      count: count(),
    })
    .from(sessions)
    .groupBy(sessions.groupAssignment);

  const counts: Record<string, number> = {
    'zero-shot': 0,
    iterative: 0,
    scaffold: 0,
  };
  for (const row of rows) {
    counts[row.groupAssignment] = row.count;
  }
  return counts;
}

/**
 * Get total number of sessions for round-robin group assignment.
 */
export async function getTotalSessionCount(): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(sessions);
  return rows[0]?.value ?? 0;
}

// ─── Session Lookup ─────────────────────────────────────────────

export async function getIncompleteSessionByParticipant(
  participantId: number,
) {
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.participantId, participantId),
        sql`${sessions.status} != 'completed'`,
      ),
    );
  return rows[0] ?? undefined;
}

// ─── Writing Samples ────────────────────────────────────────────

export async function getWritingSample(sampleId: number) {
  const rows = await db
    .select()
    .from(writingSamples)
    .where(eq(writingSamples.id, sampleId));
  return rows[0] ?? undefined;
}

// ─── Prompts & AI Responses ─────────────────────────────────────

export async function savePrompt(
  sessionId: string,
  sampleId: number,
  content: string,
) {
  // Count existing prompts for this session+sample pair
  const countRows = await db
    .select({ value: count() })
    .from(prompts)
    .where(
      and(
        eq(prompts.sessionId, sessionId),
        eq(prompts.sampleId, sampleId),
      ),
    );
  const existingCount = countRows[0]?.value ?? 0;
  const promptNumber = existingCount + 1;

  const rows = await db
    .insert(prompts)
    .values({
      sessionId,
      sampleId,
      content,
      promptNumber,
    })
    .returning();
  return rows[0];
}

export async function saveAiResponse(promptId: number, content: string) {
  const rows = await db
    .insert(aiResponses)
    .values({
      promptId,
      content,
    })
    .returning();
  return rows[0];
}

export async function getPromptsForSample(
  sessionId: string,
  sampleId: number,
) {
  // Get all prompts for this session+sample, ordered by promptNumber
  const promptRows = await db
    .select()
    .from(prompts)
    .where(
      and(
        eq(prompts.sessionId, sessionId),
        eq(prompts.sampleId, sampleId),
      ),
    )
    .orderBy(prompts.promptNumber);

  // For each prompt, get its AI response (if any)
  const results = await Promise.all(
    promptRows.map(async (prompt) => {
      const responseRows = await db
        .select()
        .from(aiResponses)
        .where(eq(aiResponses.promptId, prompt.id));
      return {
        id: prompt.id,
        content: prompt.content,
        promptNumber: prompt.promptNumber,
        createdAt: prompt.createdAt,
        aiResponse: responseRows[0]?.content ?? null,
      };
    }),
  );

  return results;
}

// ─── Survey Responses ───────────────────────────────────────────

export async function saveSurveyResponses(
  sessionId: string,
  sampleId: number,
  responses: Array<{ questionId: string; rating: number; numericValue?: number | null }>,
) {
  const rows = [];
  for (const response of responses) {
    const inserted = await db
      .insert(surveyResponses)
      .values({
        sessionId,
        sampleId,
        questionId: response.questionId,
        rating: response.rating,
        numericValue: response.numericValue ?? null,
      })
      .returning();
    rows.push(inserted[0]);
  }
  return rows;
}

export async function getSurveyResponses(sessionId: string, sampleId: number) {
  return db
    .select({
      questionId: surveyResponses.questionId,
      rating: surveyResponses.rating,
    })
    .from(surveyResponses)
    .where(
      and(
        eq(surveyResponses.sessionId, sessionId),
        eq(surveyResponses.sampleId, sampleId),
      ),
    );
}

// ─── Pre/Post Self-Efficacy Survey ──────────────────────────────

export async function savePrePostSurveyResponses(
  sessionId: string,
  phase: 'pre' | 'post',
  responses: Array<{ questionId: string; rating: number }>,
) {
  const rows = [];
  for (const response of responses) {
    const inserted = await db
      .insert(prePostSurveyResponses)
      .values({
        sessionId,
        phase,
        questionId: response.questionId,
        rating: response.rating,
      })
      .returning();
    rows.push(inserted[0]);
  }
  return rows;
}

export async function getPrePostSurveyResponses(sessionId: string, phase: 'pre' | 'post') {
  return db
    .select({
      questionId: prePostSurveyResponses.questionId,
      rating: prePostSurveyResponses.rating,
    })
    .from(prePostSurveyResponses)
    .where(
      and(
        eq(prePostSurveyResponses.sessionId, sessionId),
        eq(prePostSurveyResponses.phase, phase),
      ),
    );
}

// ─── Sample Timings ─────────────────────────────────────────────

export async function startSampleTiming(
  sessionId: string,
  sampleId: number,
  sampleIndex: number,
) {
  // Idempotent: check if a timing record already exists
  const existing = await db
    .select()
    .from(sampleTimings)
    .where(
      and(
        eq(sampleTimings.sessionId, sessionId),
        eq(sampleTimings.sampleId, sampleId),
      ),
    );
  if (existing.length > 0) {
    return existing[0];
  }

  const rows = await db
    .insert(sampleTimings)
    .values({
      sessionId,
      sampleId,
      sampleIndex,
    })
    .returning();
  return rows[0];
}

export async function completeSampleTiming(
  sessionId: string,
  sampleId: number,
) {
  const rows = await db
    .update(sampleTimings)
    .set({
      completedAt: sql`now()`,
    })
    .where(
      and(
        eq(sampleTimings.sessionId, sessionId),
        eq(sampleTimings.sampleId, sampleId),
      ),
    )
    .returning();
  return rows[0] ?? undefined;
}

export async function getSampleTimings(sessionId: string) {
  return db
    .select()
    .from(sampleTimings)
    .where(eq(sampleTimings.sessionId, sessionId))
    .orderBy(sampleTimings.sampleIndex);
}

// ─── Writing Samples (all) ──────────────────────────────────────

export async function getAllWritingSamples() {
  return db.select().from(writingSamples);
}

// ─── Researcher: Aggregate Queries ──────────────────────────────

export async function getAllSessions(group?: string) {
  // Build base query: sessions joined with participants
  let query = db
    .select({
      sessionId: sessions.id,
      participantName: participants.name,
      participantEmail: participants.email,
      group: sessions.groupAssignment,
      status: sessions.status,
      currentSampleIndex: sessions.currentSampleIndex,
      startedAt: sessions.startedAt,
      completedAt: sessions.completedAt,
    })
    .from(sessions)
    .innerJoin(participants, eq(sessions.participantId, participants.id))
    .orderBy(desc(sessions.startedAt))
    .$dynamic();

  if (group) {
    query = query.where(eq(sessions.groupAssignment, group));
  }

  const rows = await query;

  // For each session, compute aggregate stats
  const results = await Promise.all(
    rows.map(async (row) => {
      // Total prompt count
      const promptCountRows = await db
        .select({ value: count() })
        .from(prompts)
        .where(eq(prompts.sessionId, row.sessionId));
      const totalPrompts = promptCountRows[0]?.value ?? 0;

      // Total time spent: sum of (completed_at - started_at) across sample timings
      const timings = await db
        .select()
        .from(sampleTimings)
        .where(eq(sampleTimings.sessionId, row.sessionId));
      let totalTimeSeconds = 0;
      for (const t of timings) {
        if (t.completedAt && t.startedAt) {
          const start = new Date(t.startedAt).getTime();
          const end = new Date(t.completedAt).getTime();
          totalTimeSeconds += Math.max(0, (end - start) / 1000);
        }
      }

      return {
        sessionId: row.sessionId,
        participantName: row.participantName,
        participantEmail: row.participantEmail,
        group: row.group,
        status: row.status,
        samplesCompleted: Math.min(row.currentSampleIndex, 3),
        totalPrompts,
        totalTimeSeconds: Math.round(totalTimeSeconds),
        startedAt: row.startedAt,
        completedAt: row.completedAt,
      };
    }),
  );

  return results;
}

export async function getSessionDetail(sessionId: string) {
  // Fetch session
  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  const session = sessionRows[0];
  if (!session) return undefined;

  // Fetch participant
  const participantRows = await db
    .select()
    .from(participants)
    .where(eq(participants.id, session.participantId));
  const participant = participantRows[0];

  const sampleOrder: number[] = JSON.parse(session.sampleOrder);

  // Fetch all writing samples for lookup
  const allSamples = await getAllWritingSamples();
  const sampleMap = new Map(allSamples.map((s) => [s.id, s]));

  // Build per-sample detail
  const samplesDetail = await Promise.all(
    sampleOrder.map(async (sampleId, index) => {
      const sample = sampleMap.get(sampleId);

      // Prompts with AI responses
      const promptRows = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.sessionId, sessionId),
            eq(prompts.sampleId, sampleId),
          ),
        )
        .orderBy(prompts.promptNumber);

      const promptsWithResponses = await Promise.all(
        promptRows.map(async (p) => {
          const responseRows = await db
            .select()
            .from(aiResponses)
            .where(eq(aiResponses.promptId, p.id));
          return {
            id: p.id,
            content: p.content,
            promptNumber: p.promptNumber,
            createdAt: p.createdAt,
            aiResponse: responseRows[0]?.content ?? null,
          };
        }),
      );

      // Revisions
      const revisionRows = await db
        .select()
        .from(revisions)
        .where(
          and(
            eq(revisions.sessionId, sessionId),
            eq(revisions.sampleId, sampleId),
          ),
        )
        .orderBy(revisions.revisionNumber);

      // Survey responses
      const surveyRows = await db
        .select({
          questionId: surveyResponses.questionId,
          rating: surveyResponses.rating,
          numericValue: surveyResponses.numericValue,
        })
        .from(surveyResponses)
        .where(
          and(
            eq(surveyResponses.sessionId, sessionId),
            eq(surveyResponses.sampleId, sampleId),
          ),
        );
      const surveyMap: Record<string, number> = {};
      for (const s of surveyRows) {
        surveyMap[s.questionId] = s.numericValue ?? s.rating;
      }

      // Timing
      const timingRows = await db
        .select()
        .from(sampleTimings)
        .where(
          and(
            eq(sampleTimings.sessionId, sessionId),
            eq(sampleTimings.sampleId, sampleId),
          ),
        );
      const timing = timingRows[0];
      let timeSeconds: number | null = null;
      if (timing?.startedAt && timing?.completedAt) {
        const start = new Date(timing.startedAt).getTime();
        const end = new Date(timing.completedAt).getTime();
        timeSeconds = Math.round(Math.max(0, (end - start) / 1000));
      }

      // Final submission
      const finalSub = await getFinalSubmission(sessionId, sampleId);

      return {
        sampleId,
        sampleIndex: index,
        title: sample?.title ?? null,
        content: sample?.content ?? null,
        prompts: promptsWithResponses,
        revisions: revisionRows.map((r) => ({
          id: r.id,
          revisionNumber: r.revisionNumber,
          content: r.content,
          createdAt: r.createdAt,
        })),
        survey: surveyMap,
        timing: {
          startedAt: timing?.startedAt ?? null,
          completedAt: timing?.completedAt ?? null,
          timeSeconds,
        },
        finalSubmission: finalSub ? {
          finalContent: finalSub.finalContent,
          changes: JSON.parse(finalSub.changesJson),
          submittedAt: finalSub.submittedAt,
        } : null,
      };
    }),
  );

  return {
    sessionId: session.id,
    participant: {
      name: participant?.name ?? null,
      email: participant?.email ?? null,
    },
    group: session.groupAssignment,
    status: session.status,
    sampleOrder,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    samples: samplesDetail,
  };
}

export async function getExportData() {
  // Fetch all sessions with participants
  const sessionRows = await db
    .select({
      sessionId: sessions.id,
      participantName: participants.name,
      participantEmail: participants.email,
      participantCreatedAt: participants.createdAt,
      group: sessions.groupAssignment,
      status: sessions.status,
      sampleOrder: sessions.sampleOrder,
      startedAt: sessions.startedAt,
      completedAt: sessions.completedAt,
    })
    .from(sessions)
    .innerJoin(participants, eq(sessions.participantId, participants.id))
    .orderBy(sessions.startedAt);

  // Fetch all writing samples for lookup
  const allSamples = await getAllWritingSamples();
  const sampleMap = new Map(allSamples.map((s) => [s.id, s]));

  const rows: Array<{
    session_id: string;
    participant_name: string;
    participant_email: string;
    participant_created_at: string | Date;
    group: string;
    sample_id: number;
    sample_title: string;
    sample_index: number;
    sample_grammarly_score: number | null;
    prompt_count: number;
    total_prompt_chars: number;
    prompts_text: string;
    ai_responses_text: string;
    revision_count: number;
    final_revision_text: string;
    time_seconds: number | null;
    sample_started_at: string | Date | null;
    sample_completed_at: string | Date | null;
    // Per-task validated survey fields (11 items)
    survey_calibration_prediction: number | null;
    survey_ownership_personal: number | null;
    survey_ownership_responsibility: number | null;
    survey_ownership_connection: number | null;
    survey_ownership_emotional: number | null;
    survey_ownership_mine: number | null;
    survey_ownership_contribution: number | null;
    survey_ownership_proud: number | null;
    survey_tlx_mental_demand: number | null;
    survey_tlx_effort: number | null;
    survey_tlx_frustration: number | null;
    // Pre-study self-efficacy (8 items, repeated per sample row)
    pre_se_ideas: number | null;
    pre_se_organize: number | null;
    pre_se_express: number | null;
    pre_se_grammar: number | null;
    pre_se_structure: number | null;
    pre_se_revise: number | null;
    pre_se_focus: number | null;
    pre_se_identify_errors: number | null;
    // Post-study self-efficacy (8 items, repeated per sample row)
    post_se_ideas: number | null;
    post_se_organize: number | null;
    post_se_express: number | null;
    post_se_grammar: number | null;
    post_se_structure: number | null;
    post_se_revise: number | null;
    post_se_focus: number | null;
    post_se_identify_errors: number | null;
    final_content: string | null;
    changes_summary: string | null;
    session_status: string;
    session_started_at: string | Date;
    session_completed_at: string | Date | null;
  }> = [];

  for (const session of sessionRows) {
    const sampleOrder: number[] = JSON.parse(session.sampleOrder);

    // Fetch pre/post self-efficacy responses once per session
    const preRows = await getPrePostSurveyResponses(session.sessionId, 'pre');
    const postRows = await getPrePostSurveyResponses(session.sessionId, 'post');
    const preMap: Record<string, number> = {};
    for (const r of preRows) preMap[r.questionId] = r.rating;
    const postMap: Record<string, number> = {};
    for (const r of postRows) postMap[r.questionId] = r.rating;

    for (let index = 0; index < sampleOrder.length; index++) {
      const sampleId = sampleOrder[index];
      const sample = sampleMap.get(sampleId);

      // Prompt count, total chars, and full text
      const promptRows = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.sessionId, session.sessionId),
            eq(prompts.sampleId, sampleId),
          ),
        )
        .orderBy(prompts.promptNumber);
      const promptCount = promptRows.length;
      const totalPromptChars = promptRows.reduce(
        (sum, p) => sum + p.content.length,
        0,
      );

      // Fetch AI responses for each prompt
      const promptTexts: string[] = [];
      const aiResponseTexts: string[] = [];
      for (const p of promptRows) {
        promptTexts.push(`[Prompt ${p.promptNumber}] ${p.content}`);
        const aiRows = await db
          .select()
          .from(aiResponses)
          .where(eq(aiResponses.promptId, p.id));
        if (aiRows.length > 0) {
          aiResponseTexts.push(`[Response ${p.promptNumber}] ${aiRows[0].content}`);
        }
      }

      // Revisions: count and final text
      const revisionRows = await db
        .select()
        .from(revisions)
        .where(
          and(
            eq(revisions.sessionId, session.sessionId),
            eq(revisions.sampleId, sampleId),
          ),
        )
        .orderBy(revisions.revisionNumber);
      const revisionCount = revisionRows.length;
      const finalRevision = revisionRows.length > 0 ? revisionRows[revisionRows.length - 1].content : '';

      // Timing
      const timingRows = await db
        .select()
        .from(sampleTimings)
        .where(
          and(
            eq(sampleTimings.sessionId, session.sessionId),
            eq(sampleTimings.sampleId, sampleId),
          ),
        );
      const timing = timingRows[0];
      let timeSeconds: number | null = null;
      if (timing?.startedAt && timing?.completedAt) {
        const start = new Date(timing.startedAt).getTime();
        const end = new Date(timing.completedAt).getTime();
        timeSeconds = Math.round(Math.max(0, (end - start) / 1000));
      }

      // Survey responses
      const surveyRows = await db
        .select({
          questionId: surveyResponses.questionId,
          rating: surveyResponses.rating,
          numericValue: surveyResponses.numericValue,
        })
        .from(surveyResponses)
        .where(
          and(
            eq(surveyResponses.sessionId, session.sessionId),
            eq(surveyResponses.sampleId, sampleId),
          ),
        );
      const surveyMap: Record<string, number> = {};
      for (const s of surveyRows) {
        // For number_input questions, use numericValue; otherwise use rating
        surveyMap[s.questionId] = s.numericValue ?? s.rating;
      }

      // Final submission
      const finalSub = await getFinalSubmission(session.sessionId, sampleId);

      // Summarize changes for CSV
      let changesSummary: string | null = null;
      if (finalSub) {
        try {
          const changes = JSON.parse(finalSub.changesJson) as Array<{ type: string; text: string }>;
          const addedWords = changes.filter(c => c.type === 'added').reduce((n, c) => n + c.text.trim().split(/\s+/).length, 0);
          const removedWords = changes.filter(c => c.type === 'removed').reduce((n, c) => n + c.text.trim().split(/\s+/).length, 0);
          changesSummary = `+${addedWords} -${removedWords} words`;
        } catch { changesSummary = null; }
      }

      rows.push({
        session_id: session.sessionId,
        participant_name: session.participantName,
        participant_email: session.participantEmail,
        participant_created_at: session.participantCreatedAt,
        group: session.group,
        sample_id: sampleId,
        sample_title: sample?.title ?? '',
        sample_index: index,
        sample_grammarly_score: sample?.grammarlyScore ?? null,
        prompt_count: promptCount,
        total_prompt_chars: totalPromptChars,
        prompts_text: promptTexts.join(' ||| '),
        ai_responses_text: aiResponseTexts.join(' ||| '),
        revision_count: revisionCount,
        final_revision_text: finalRevision,
        time_seconds: timeSeconds,
        sample_started_at: timing?.startedAt ?? null,
        sample_completed_at: timing?.completedAt ?? null,
        survey_calibration_prediction: surveyMap['calibration_prediction'] ?? null,
        survey_ownership_personal: surveyMap['ownership_personal'] ?? null,
        survey_ownership_responsibility: surveyMap['ownership_responsibility'] ?? null,
        survey_ownership_connection: surveyMap['ownership_connection'] ?? null,
        survey_ownership_emotional: surveyMap['ownership_emotional'] ?? null,
        survey_ownership_mine: surveyMap['ownership_mine'] ?? null,
        survey_ownership_contribution: surveyMap['ownership_contribution'] ?? null,
        survey_ownership_proud: surveyMap['ownership_proud'] ?? null,
        survey_tlx_mental_demand: surveyMap['tlx_mental_demand'] ?? null,
        survey_tlx_effort: surveyMap['tlx_effort'] ?? null,
        survey_tlx_frustration: surveyMap['tlx_frustration'] ?? null,
        pre_se_ideas: preMap['se_ideas'] ?? null,
        pre_se_organize: preMap['se_organize'] ?? null,
        pre_se_express: preMap['se_express'] ?? null,
        pre_se_grammar: preMap['se_grammar'] ?? null,
        pre_se_structure: preMap['se_structure'] ?? null,
        pre_se_revise: preMap['se_revise'] ?? null,
        pre_se_focus: preMap['se_focus'] ?? null,
        pre_se_identify_errors: preMap['se_identify_errors'] ?? null,
        post_se_ideas: postMap['se_ideas'] ?? null,
        post_se_organize: postMap['se_organize'] ?? null,
        post_se_express: postMap['se_express'] ?? null,
        post_se_grammar: postMap['se_grammar'] ?? null,
        post_se_structure: postMap['se_structure'] ?? null,
        post_se_revise: postMap['se_revise'] ?? null,
        post_se_focus: postMap['se_focus'] ?? null,
        post_se_identify_errors: postMap['se_identify_errors'] ?? null,
        final_content: finalSub?.finalContent ?? null,
        changes_summary: changesSummary,
        session_status: session.status,
        session_started_at: session.startedAt,
        session_completed_at: session.completedAt,
      });
    }
  }

  return rows;
}

// ─── Final Submissions ──────────────────────────────────────────

interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

/**
 * Compute a word-level diff between original and final text via LCS.
 * Tokens preserve whitespace so the output can be joined losslessly.
 */
function computeDiff(original: string, final: string): DiffChange[] {
  // Tokenize into words, keeping whitespace attached to the preceding word
  const tokenize = (text: string): string[] => {
    const tokens: string[] = [];
    const re = /\S+\s*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      tokens.push(m[0]);
    }
    return tokens;
  };

  const origTokens = tokenize(original);
  const finalTokens = tokenize(final);
  const m = origTokens.length;
  const n = finalTokens.length;

  // LCS dp — use Uint16Array rows for speed
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origTokens[i - 1] === finalTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const stack: DiffChange[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origTokens[i - 1] === finalTokens[j - 1]) {
      stack.push({ type: 'unchanged', text: origTokens[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'added', text: finalTokens[j - 1] });
      j--;
    } else {
      stack.push({ type: 'removed', text: origTokens[i - 1] });
      i--;
    }
  }

  // Reverse and merge consecutive runs of the same type
  const raw: DiffChange[] = [];
  while (stack.length > 0) raw.push(stack.pop()!);

  const merged: DiffChange[] = [];
  for (const c of raw) {
    const last = merged[merged.length - 1];
    if (last && last.type === c.type) {
      last.text += c.text;
    } else {
      merged.push({ type: c.type, text: c.text });
    }
  }

  return merged;
}

export async function saveFinalSubmission(
  sessionId: string,
  sampleId: number,
  originalContent: string,
  finalContent: string,
) {
  const changes = computeDiff(originalContent, finalContent);

  const rows = await db
    .insert(finalSubmissions)
    .values({
      sessionId,
      sampleId,
      originalContent,
      finalContent,
      changesJson: JSON.stringify(changes),
    })
    .returning();
  return rows[0];
}

export async function getFinalSubmission(sessionId: string, sampleId: number) {
  const rows = await db
    .select()
    .from(finalSubmissions)
    .where(
      and(
        eq(finalSubmissions.sessionId, sessionId),
        eq(finalSubmissions.sampleId, sampleId),
      ),
    );
  return rows[0] ?? undefined;
}

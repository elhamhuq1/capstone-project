import crypto from 'crypto';
import { eq, and, sql, count, desc, sum } from 'drizzle-orm';
import { db } from './index';
import { participants, sessions, writingSamples, revisions, prompts, aiResponses, surveyResponses, sampleTimings } from './schema';

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
    // All samples completed
    const rows = await db
      .update(sessions)
      .set({
        currentSampleIndex: newIndex,
        status: 'completed',
        completedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
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
    'single-shot': 0,
    iterative: 0,
    scaffold: 0,
  };
  for (const row of rows) {
    counts[row.groupAssignment] = row.count;
  }
  return counts;
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
  responses: Array<{ questionId: string; rating: number }>,
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
      completedAt: sql`datetime('now')`,
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
        surveyMap[s.questionId] = s.rating;
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
    participant_name: string;
    participant_email: string;
    group: string;
    sample_id: number;
    sample_title: string;
    sample_index: number;
    prompt_count: number;
    total_prompt_chars: number;
    revision_count: number;
    time_seconds: number | null;
    survey_authorship: number | null;
    survey_satisfaction: number | null;
    survey_cognitive_load: number | null;
    survey_helpfulness: number | null;
    survey_future_intent: number | null;
    session_status: string;
    session_started_at: string;
    session_completed_at: string | null;
  }> = [];

  for (const session of sessionRows) {
    const sampleOrder: number[] = JSON.parse(session.sampleOrder);

    for (let index = 0; index < sampleOrder.length; index++) {
      const sampleId = sampleOrder[index];
      const sample = sampleMap.get(sampleId);

      // Prompt count and total chars
      const promptRows = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.sessionId, session.sessionId),
            eq(prompts.sampleId, sampleId),
          ),
        );
      const promptCount = promptRows.length;
      const totalPromptChars = promptRows.reduce(
        (sum, p) => sum + p.content.length,
        0,
      );

      // Revision count
      const revisionCountRows = await db
        .select({ value: count() })
        .from(revisions)
        .where(
          and(
            eq(revisions.sessionId, session.sessionId),
            eq(revisions.sampleId, sampleId),
          ),
        );
      const revisionCount = revisionCountRows[0]?.value ?? 0;

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
        surveyMap[s.questionId] = s.rating;
      }

      rows.push({
        participant_name: session.participantName,
        participant_email: session.participantEmail,
        group: session.group,
        sample_id: sampleId,
        sample_title: sample?.title ?? '',
        sample_index: index,
        prompt_count: promptCount,
        total_prompt_chars: totalPromptChars,
        revision_count: revisionCount,
        time_seconds: timeSeconds,
        survey_authorship: surveyMap['authorship'] ?? null,
        survey_satisfaction: surveyMap['satisfaction'] ?? null,
        survey_cognitive_load: surveyMap['cognitive_load'] ?? null,
        survey_helpfulness: surveyMap['helpfulness'] ?? null,
        survey_future_intent: surveyMap['future_intent'] ?? null,
        session_status: session.status,
        session_started_at: session.startedAt,
        session_completed_at: session.completedAt,
      });
    }
  }

  return rows;
}

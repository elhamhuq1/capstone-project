import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  savePrePostSurveyResponses,
  getPrePostSurveyResponses,
  updateSessionStatus,
} from '@/lib/db/queries';
import { SELF_EFFICACY_QUESTIONS } from '@/lib/survey';

const VALID_QUESTION_IDS = new Set(SELF_EFFICACY_QUESTIONS.map((q) => q.id));
const VALID_PHASES = new Set(['pre', 'post']);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Session is already completed' }, { status: 400 });
    }

    const body = await request.json();
    const { phase, responses } = body as {
      phase?: string;
      responses?: Array<{ questionId: string; rating: number }>;
    };

    if (!phase || !VALID_PHASES.has(phase)) {
      return NextResponse.json(
        { error: 'phase must be "pre" or "post"' },
        { status: 400 },
      );
    }

    if (!Array.isArray(responses) || responses.length !== SELF_EFFICACY_QUESTIONS.length) {
      return NextResponse.json(
        { error: `responses must be an array of exactly ${SELF_EFFICACY_QUESTIONS.length} items` },
        { status: 400 },
      );
    }

    for (const r of responses) {
      if (!VALID_QUESTION_IDS.has(r.questionId)) {
        return NextResponse.json(
          { error: `Invalid questionId: ${r.questionId}` },
          { status: 400 },
        );
      }
      if (
        typeof r.rating !== 'number' ||
        !Number.isInteger(r.rating) ||
        r.rating < 1 ||
        r.rating > 7
      ) {
        return NextResponse.json(
          { error: `Rating must be an integer 1-7, got: ${r.rating}` },
          { status: 400 },
        );
      }
    }

    // Check if already submitted
    const existing = await getPrePostSurveyResponses(sessionId, phase as 'pre' | 'post');
    if (existing.length > 0) {
      return NextResponse.json(
        { error: `${phase}-survey already submitted` },
        { status: 400 },
      );
    }

    await savePrePostSurveyResponses(sessionId, phase as 'pre' | 'post', responses);

    // Advance session status
    if (phase === 'pre') {
      await updateSessionStatus(sessionId, 'in-progress');
    } else if (phase === 'post') {
      // Post-survey is the last step — mark session completed with timestamp
      const { db } = await import('@/lib/db');
      const { sessions } = await import('@/lib/db/schema');
      const { eq } = await import('drizzle-orm');
      await db
        .update(sessions)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(sessions.id, sessionId));
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[pre-post-survey] POST error:', message);
    return NextResponse.json(
      { error: `Failed to save survey: ${message}` },
      { status: 500 },
    );
  }
}

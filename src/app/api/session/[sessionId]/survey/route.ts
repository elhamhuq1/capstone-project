import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  saveSurveyResponses,
} from '@/lib/db/queries';
import { SURVEY_QUESTIONS } from '@/lib/survey';

const VALID_QUESTION_IDS = new Set<string>(SURVEY_QUESTIONS.map((q) => q.id));

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      );
    }
    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Session is already completed' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { sampleId, responses } = body as {
      sampleId?: number;
      responses?: Array<{ questionId: string; rating: number }>;
    };

    if (typeof sampleId !== 'number') {
      return NextResponse.json(
        { error: 'sampleId must be a number' },
        { status: 400 },
      );
    }

    if (!Array.isArray(responses) || responses.length !== 5) {
      return NextResponse.json(
        { error: 'responses must be an array of exactly 5 items' },
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
        r.rating > 5
      ) {
        return NextResponse.json(
          { error: `Rating must be an integer 1-5, got: ${r.rating}` },
          { status: 400 },
        );
      }
    }

    await saveSurveyResponses(sessionId, sampleId, responses);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[survey] POST error:', message);
    return NextResponse.json(
      { error: `Failed to save survey: ${message}` },
      { status: 500 },
    );
  }
}

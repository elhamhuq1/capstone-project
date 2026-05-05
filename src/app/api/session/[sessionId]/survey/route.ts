import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  saveSurveyResponses,
} from '@/lib/db/queries';
import { TASK_SURVEY_QUESTIONS } from '@/lib/survey';

const VALID_QUESTION_IDS = new Set<string>(TASK_SURVEY_QUESTIONS.map((q) => q.id));
const QUESTION_MAP = new Map(TASK_SURVEY_QUESTIONS.map((q) => [q.id, q]));

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
      responses?: Array<{ questionId: string; rating: number; numericValue?: number | null }>;
    };

    if (typeof sampleId !== 'number') {
      return NextResponse.json(
        { error: 'sampleId must be a number' },
        { status: 400 },
      );
    }

    if (!Array.isArray(responses) || responses.length !== TASK_SURVEY_QUESTIONS.length) {
      return NextResponse.json(
        { error: `responses must be an array of exactly ${TASK_SURVEY_QUESTIONS.length} items` },
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

      const question = QUESTION_MAP.get(r.questionId)!;

      if (question.type === 'number_input') {
        // For number_input, rating stores 0 as sentinel, numericValue holds the actual value
        if (r.numericValue === undefined || r.numericValue === null || typeof r.numericValue !== 'number') {
          return NextResponse.json(
            { error: `numericValue required for question: ${r.questionId}` },
            { status: 400 },
          );
        }
      } else {
        // Likert scale validation
        const maxScale = question.type === 'likert7' ? 7 : 5;
        if (
          typeof r.rating !== 'number' ||
          !Number.isInteger(r.rating) ||
          r.rating < 1 ||
          r.rating > maxScale
        ) {
          return NextResponse.json(
            { error: `Rating must be an integer 1-${maxScale} for ${r.questionId}, got: ${r.rating}` },
            { status: 400 },
          );
        }
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

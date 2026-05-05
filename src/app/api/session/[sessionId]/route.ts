import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionWithCurrentSample,
  getRevisions,
  getPromptsForSample,
  updateSessionStatus,
  getSurveyResponses,
  getSampleTimings,
  getPrePostSurveyResponses,
} from '@/lib/db/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const result = await getSessionWithCurrentSample(sessionId);

    if (!result) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      );
    }

    const { session, sample } = result;
    const sampleOrder: number[] = JSON.parse(session.sampleOrder);

    // Fetch revisions for the current sample (if one exists)
    let revisionList: Awaited<ReturnType<typeof getRevisions>> = [];
    let messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (sample) {
      revisionList = await getRevisions(session.id, sample.id);

      // Build chat history from prompts + AI responses
      const promptHistory = await getPromptsForSample(session.id, sample.id);
      for (const prompt of promptHistory) {
        messages.push({ role: 'user', content: prompt.content });
        if (prompt.aiResponse) {
          messages.push({ role: 'assistant', content: prompt.aiResponse });
        }
      }
    }

    // Check sample submission and survey completion for current sample
    let sampleSubmitted = false;
    let surveyCompleted = false;
    if (sample) {
      const timings = await getSampleTimings(session.id);
      const currentTiming = timings.find((t) => t.sampleId === sample.id);
      sampleSubmitted = currentTiming?.completedAt != null;

      const surveyRows = await getSurveyResponses(session.id, sample.id);
      surveyCompleted = surveyRows.length > 0;
    }

    // Check pre/post survey completion
    const preSurveyRows = await getPrePostSurveyResponses(session.id, 'pre');
    const postSurveyRows = await getPrePostSurveyResponses(session.id, 'post');
    const preSurveyCompleted = preSurveyRows.length > 0;
    const postSurveyCompleted = postSurveyRows.length > 0;

    return NextResponse.json({
      id: session.id,
      participantId: session.participantId,
      group: session.groupAssignment,
      status: session.status,
      currentSampleIndex: session.currentSampleIndex,
      totalSamples: 3,
      sampleOrder,
      currentSample: sample
        ? { id: sample.id, title: sample.title, content: sample.content, grammarlyScore: sample.grammarlyScore }
        : null,
      revisions: revisionList.map((r) => ({
        id: r.id,
        revisionNumber: r.revisionNumber,
        content: r.content,
        createdAt: r.createdAt,
      })),
      messages,
      sampleSubmitted,
      surveyCompleted,
      preSurveyCompleted,
      postSurveyCompleted,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[session] GET error:', message);
    return NextResponse.json(
      { error: `Failed to load session: ${message}` },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { action } = body as { action?: string };

    if (action === 'begin') {
      const updated = await updateSessionStatus(sessionId, 'pre-survey');
      if (!updated) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 },
        );
      }
      return NextResponse.json({
        id: updated.id,
        status: updated.status,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: begin' },
      { status: 400 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[session] POST error:', message);
    return NextResponse.json(
      { error: `Failed to update session: ${message}` },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  saveRevision,
  advanceSample,
  getSessionWithCurrentSample,
} from '@/lib/db/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    // Parse body — content is optional
    let content: string | undefined;
    try {
      const body = await request.json();
      content = body.content;
    } catch {
      // Empty body is fine — content is optional
    }

    // Validate session exists
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      );
    }

    // Validate session isn't completed
    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Session is already completed' },
        { status: 400 },
      );
    }

    // If content provided, save a final revision before advancing
    if (content && typeof content === 'string' && content.trim().length > 0) {
      const sampleOrder: number[] = JSON.parse(session.sampleOrder);
      const sampleId = sampleOrder[session.currentSampleIndex];
      if (sampleId !== undefined) {
        await saveRevision(sessionId, sampleId, content);
      }
    }

    // Advance to next sample (or mark completed)
    const updated = await advanceSample(sessionId);
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to advance sample' },
        { status: 500 },
      );
    }

    const isCompleted = updated.status === 'completed';

    // If not completed, fetch the next sample so client doesn't need a separate fetch
    if (!isCompleted) {
      const nextData = await getSessionWithCurrentSample(sessionId);
      if (nextData && nextData.sample) {
        return NextResponse.json({
          currentSampleIndex: updated.currentSampleIndex,
          status: updated.status,
          completed: false,
          nextSample: {
            id: nextData.sample.id,
            title: nextData.sample.title,
            content: nextData.sample.content,
          },
        });
      }
    }

    return NextResponse.json({
      currentSampleIndex: updated.currentSampleIndex,
      status: updated.status,
      completed: isCompleted,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[advance] POST error:', message);
    return NextResponse.json(
      { error: `Failed to advance sample: ${message}` },
      { status: 500 },
    );
  }
}

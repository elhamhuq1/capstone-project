import { NextRequest, NextResponse } from 'next/server';
import { getSession, saveFinalSubmission, saveRevision, getWritingSample } from '@/lib/db/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { finalContent } = body as { finalContent?: string };

    if (!finalContent || typeof finalContent !== 'string' || finalContent.trim().length === 0) {
      return NextResponse.json({ error: 'finalContent is required' }, { status: 400 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Session is already completed' }, { status: 400 });
    }

    const sampleOrder: number[] = JSON.parse(session.sampleOrder);
    const sampleId = sampleOrder[session.currentSampleIndex];
    if (sampleId === undefined) {
      return NextResponse.json({ error: 'No current sample available' }, { status: 400 });
    }

    // Get original content
    const sample = await getWritingSample(sampleId);
    if (!sample) {
      return NextResponse.json({ error: 'Writing sample not found' }, { status: 404 });
    }

    // Save as a revision too (keeps revision history complete)
    const revision = await saveRevision(sessionId, sampleId, finalContent);

    // Save the final submission with diff
    const submission = await saveFinalSubmission(sessionId, sampleId, sample.content, finalContent);

    return NextResponse.json({
      revisionNumber: revision.revisionNumber,
      submissionId: submission.id,
      createdAt: revision.createdAt,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[submit] POST error:', message);
    return NextResponse.json({ error: `Failed to submit: ${message}` }, { status: 500 });
  }
}

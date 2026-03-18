import { NextRequest, NextResponse } from 'next/server';
import { getSession, saveRevision } from '@/lib/db/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { content } = body as { content?: string };

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required and must be a non-empty string' },
        { status: 400 },
      );
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

    // Determine current sample ID from sample order
    const sampleOrder: number[] = JSON.parse(session.sampleOrder);
    const sampleId = sampleOrder[session.currentSampleIndex];

    if (sampleId === undefined) {
      return NextResponse.json(
        { error: 'No current sample available' },
        { status: 400 },
      );
    }

    const revision = await saveRevision(sessionId, sampleId, content);

    return NextResponse.json(
      {
        revisionNumber: revision.revisionNumber,
        sampleId: revision.sampleId,
        createdAt: revision.createdAt,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[revision] POST error:', message);
    return NextResponse.json(
      { error: `Failed to save revision: ${message}` },
      { status: 500 },
    );
  }
}

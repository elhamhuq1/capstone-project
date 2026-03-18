import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  startSampleTiming,
  completeSampleTiming,
} from '@/lib/db/queries';

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

    const body = await request.json();
    const { sampleId, sampleIndex, event } = body as {
      sampleId?: number;
      sampleIndex?: number;
      event?: string;
    };

    if (typeof sampleId !== 'number') {
      return NextResponse.json(
        { error: 'sampleId must be a number' },
        { status: 400 },
      );
    }

    if (event !== 'start' && event !== 'complete') {
      return NextResponse.json(
        { error: "event must be 'start' or 'complete'" },
        { status: 400 },
      );
    }

    if (event === 'start') {
      if (typeof sampleIndex !== 'number') {
        return NextResponse.json(
          { error: 'sampleIndex must be a number for start events' },
          { status: 400 },
        );
      }
      await startSampleTiming(sessionId, sampleId, sampleIndex);
    } else {
      await completeSampleTiming(sessionId, sampleId);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[timing] POST error:', message);
    return NextResponse.json(
      { error: `Failed to save timing: ${message}` },
      { status: 500 },
    );
  }
}

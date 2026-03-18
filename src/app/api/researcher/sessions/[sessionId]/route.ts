import { NextRequest, NextResponse } from 'next/server';
import { getSessionDetail } from '@/lib/db/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const detail = await getSessionDetail(sessionId);

    if (!detail) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(detail);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[researcher/sessions/detail] GET error:', message);
    return NextResponse.json(
      { error: `Failed to fetch session detail: ${message}` },
      { status: 500 },
    );
  }
}

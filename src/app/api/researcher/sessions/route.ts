import { NextRequest, NextResponse } from 'next/server';
import { getAllSessions } from '@/lib/db/queries';

const VALID_GROUPS = ['single-shot', 'iterative', 'scaffold'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group') ?? undefined;

    if (group && !VALID_GROUPS.includes(group)) {
      return NextResponse.json(
        { error: `Invalid group filter. Valid values: ${VALID_GROUPS.join(', ')}` },
        { status: 400 },
      );
    }

    const sessions = await getAllSessions(group);
    return NextResponse.json(sessions);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[researcher/sessions] GET error:', message);
    return NextResponse.json(
      { error: `Failed to fetch sessions: ${message}` },
      { status: 500 },
    );
  }
}

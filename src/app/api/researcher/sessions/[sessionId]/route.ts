import { NextRequest, NextResponse } from 'next/server';
import { getSessionDetail } from '@/lib/db/queries';
import { db } from '@/lib/db';
import {
  sessions,
  revisions,
  prompts,
  aiResponses,
  surveyResponses,
  sampleTimings,
  finalSubmissions,
  participants,
} from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

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

/**
 * DELETE /api/researcher/sessions/[sessionId]
 * Deletes a session and all associated data (revisions, prompts, AI responses,
 * survey responses, timings, final submissions). Orphaned participants
 * (those with no remaining sessions) are also cleaned up.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    // Verify session exists and get participant ID for orphan cleanup
    const sessionRows = await db
      .select({ id: sessions.id, participantId: sessions.participantId })
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (sessionRows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      );
    }

    const participantId = sessionRows[0].participantId;

    // Get all prompt IDs for this session (needed to delete AI responses)
    const promptRows = await db
      .select({ id: prompts.id })
      .from(prompts)
      .where(eq(prompts.sessionId, sessionId));
    const promptIds = promptRows.map((p) => p.id);

    // Delete AI responses for all prompts in this session
    if (promptIds.length > 0) {
      await db
        .delete(aiResponses)
        .where(inArray(aiResponses.promptId, promptIds));
    }

    // Delete prompts
    await db.delete(prompts).where(eq(prompts.sessionId, sessionId));

    // Delete revisions
    await db.delete(revisions).where(eq(revisions.sessionId, sessionId));

    // Delete survey responses
    await db.delete(surveyResponses).where(eq(surveyResponses.sessionId, sessionId));

    // Delete sample timings
    await db.delete(sampleTimings).where(eq(sampleTimings.sessionId, sessionId));

    // Delete final submissions
    await db.delete(finalSubmissions).where(eq(finalSubmissions.sessionId, sessionId));

    // Delete the session itself
    await db.delete(sessions).where(eq(sessions.id, sessionId));

    // Clean up orphaned participant (no remaining sessions)
    const remainingSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.participantId, participantId));

    if (remainingSessions.length === 0) {
      await db.delete(participants).where(eq(participants.id, participantId));
    }

    return NextResponse.json({ deleted: true, sessionId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[researcher/sessions/delete] DELETE error:', message);
    return NextResponse.json(
      { error: `Failed to delete session: ${message}` },
      { status: 500 },
    );
  }
}

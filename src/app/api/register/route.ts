import { NextRequest, NextResponse } from 'next/server';
import {
  createParticipant,
  findParticipantByEmail,
  createSession,
  getIncompleteSessionByParticipant,
  getTotalSessionCount,
} from '@/lib/db/queries';
import { seedWritingSamples } from '@/lib/samples';

const GROUPS = ['zero-shot', 'iterative', 'scaffold'] as const;

function shuffledSampleOrder(): number[] {
  const order = [1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Round-robin group assignment: 1st registration → zero-shot,
 * 2nd → iterative, 3rd → scaffold, then repeats.
 */
function pickGroupRoundRobin(totalSessions: number): string {
  return GROUPS[totalSessions % GROUPS.length];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body as { name?: string; email?: string };

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Please provide both name and email' },
        { status: 400 },
      );
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Check for existing participant
    const existing = await findParticipantByEmail(trimmedEmail);

    if (existing) {
      // R016: session resume — return existing incomplete session
      const incomplete = await getIncompleteSessionByParticipant(existing.id);
      if (incomplete) {
        const sampleOrder: number[] = JSON.parse(incomplete.sampleOrder);
        return NextResponse.json(
          {
            sessionId: incomplete.id,
            group: incomplete.groupAssignment,
            sampleOrder,
          },
          { status: 200 },
        );
      }
    }

    // Ensure writing samples are seeded (idempotent)
    await seedWritingSamples();

    // Create participant if they don't exist
    const participant = existing ?? (await createParticipant(trimmedName, trimmedEmail));

    // Round-robin group assignment based on total session count
    const totalSessions = await getTotalSessionCount();
    const group = pickGroupRoundRobin(totalSessions);

    // Randomized sample order (Fisher-Yates)
    const sampleOrder = shuffledSampleOrder();

    // Create new session
    const session = await createSession(participant.id, group, sampleOrder);

    return NextResponse.json(
      {
        sessionId: session.id,
        group: session.groupAssignment,
        sampleOrder,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[register] Error:', message);
    return NextResponse.json(
      { error: `Registration failed: ${message}` },
      { status: 500 },
    );
  }
}

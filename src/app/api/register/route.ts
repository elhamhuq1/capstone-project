import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  createParticipant,
  findParticipantByEmail,
  createSession,
  getIncompleteSessionByParticipant,
  getGroupCounts,
} from '@/lib/db/queries';
import { seedWritingSamples } from '@/lib/samples';

const GROUPS = ['single-shot', 'iterative', 'scaffold'] as const;

function shuffledSampleOrder(): number[] {
  const order = [1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function pickGroup(counts: Record<string, number>): string {
  const min = Math.min(...GROUPS.map((g) => counts[g] ?? 0));
  const candidates = GROUPS.filter((g) => (counts[g] ?? 0) === min);
  return candidates[Math.floor(Math.random() * candidates.length)];
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
    await seedWritingSamples(db);

    // Create participant if they don't exist
    const participant = existing ?? (await createParticipant(trimmedName, trimmedEmail));

    // Balanced group assignment
    const counts = await getGroupCounts();
    const group = pickGroup(counts);

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

import { resetQueueState } from '@/actions/queue/reset-queue-state';
import { type NextRequest, NextResponse } from 'next/server';
import type { QueueName, QueueState } from 'shared/types';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queueName = searchParams.get('queueName') as QueueName;
  const state = searchParams.get('state') as QueueState;

  if (!queueName) {
    return NextResponse.json(
      { error: 'Missing or invalid queueName' },
      { status: 400 },
    );
  }

  if (!state) {
    return NextResponse.json(
      { error: 'Missing or invalid state' },
      { status: 400 },
    );
  }

  try {
    const success = await resetQueueState(queueName, state);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Successfully reset ${state} jobs from ${queueName}`,
      });
    }

    return NextResponse.json(
      { error: 'Failed to reset queue state' },
      { status: 500 },
    );
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Failed to reset queue state';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

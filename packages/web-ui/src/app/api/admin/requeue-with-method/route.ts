import { requeueItemsWithMethod } from '@/actions/queue/requeue-items-with-method';
import { type NextRequest, NextResponse } from 'next/server';
import type { QueueName, QueueState } from 'shared/types';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queueName = searchParams.get('queueName') as QueueName;
  const state = searchParams.get('state') as QueueState;
  const method = searchParams.get('method');

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

  if (!method) {
    return NextResponse.json(
      { error: 'Missing or invalid method' },
      { status: 400 },
    );
  }

  try {
    const requeuedCount = await requeueItemsWithMethod(
      queueName,
      method,
      state,
    );

    if (requeuedCount === -1) {
      return NextResponse.json(
        { error: 'Failed to requeue items' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully requeued ${requeuedCount} items from ${state} state in ${queueName} with method ${method}`,
      requeuedCount,
    });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Failed to requeue items with method';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

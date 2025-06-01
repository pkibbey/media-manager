import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { type NextRequest, NextResponse } from 'next/server';

const connection = new IORedis();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queueName = searchParams.get('queueName');
  if (!queueName) {
    return NextResponse.json(
      { error: 'Missing or invalid queueName' },
      { status: 400 },
    );
  }
  try {
    const queue = new Queue(queueName, { connection });
    const paused = await queue.isPaused();
    return NextResponse.json({ paused });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Failed to get queue pause state';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queueName = searchParams.get('queueName');
  if (!queueName) {
    return NextResponse.json(
      { error: 'Missing or invalid queueName' },
      { status: 400 },
    );
  }
  try {
    const { pause } = await req.json();
    if (typeof pause !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid pause value' },
        { status: 400 },
      );
    }
    const queue = new Queue(queueName, { connection });
    if (pause) {
      await queue.pause();
    } else {
      await queue.resume();
    }
    return NextResponse.json({ paused: pause });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Failed to set queue pause state';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

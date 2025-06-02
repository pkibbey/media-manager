import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ queueName: string }> },
) {
  const { queueName } = await params;
  if (typeof queueName !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid queueName' },
      { status: 400 },
    );
  }

  try {
    const connection = new IORedis(
      process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
      {
        maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
      },
    );

    const queue = new Queue(queueName, { connection });
    const counts = await queue.getJobCounts();

    return NextResponse.json(
      { counts },
      {
        status: 200,
      },
    );
  } catch (e) {
    // Handle errors gracefully
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { type NextRequest, NextResponse } from 'next/server';

const connection = new IORedis(
  process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
  {
    maxRetriesPerRequest: null,
  },
);

export async function POST(req: NextRequest) {
  try {
    const { queueName, state } = await req.json();
    
    if (!queueName || !state) {
      return NextResponse.json(
        { error: 'Missing queueName or state parameter' },
        { status: 400 },
      );
    }

    // Validate state parameter - these are the valid BullMQ job states
    const validStates = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused', 'waiting-children', 'prioritized'];
    if (!validStates.includes(state)) {
      return NextResponse.json(
        { error: `Invalid state. Valid states are: ${validStates.join(', ')}` },
        { status: 400 },
      );
    }

    const queue = new Queue(queueName, { connection });
    
    // Clean jobs by state
    // For BullMQ, we use clean() method which removes jobs by state and age
    // Setting age to 0 removes all jobs regardless of age
    // Some states need special handling
    let removedCount = 0;
    
    switch (state) {
      case 'completed':
        removedCount = await queue.clean(0, 1000000, 'completed');
        break;
      case 'failed':
        removedCount = await queue.clean(0, 1000000, 'failed');
        break;
      case 'active':
        // Active jobs are currently running, so we need to handle them carefully
        // We'll drain and pause the queue, then resume it
        await queue.pause();
        await queue.drain(false); // Don't remove delayed jobs
        await queue.resume();
        removedCount = 0; // drain doesn't return count
        break;
      case 'waiting':
        removedCount = await queue.clean(0, 1000000, 'waiting');
        break;
      case 'delayed':
        removedCount = await queue.clean(0, 1000000, 'delayed');
        break;
      case 'paused':
        // Paused jobs are actually waiting jobs when queue is paused
        // Resume queue, clean waiting jobs, then pause again if it was paused
        const wasPaused = await queue.isPaused();
        if (wasPaused) {
          await queue.resume();
          removedCount = await queue.clean(0, 1000000, 'waiting');
          await queue.pause();
        } else {
          removedCount = 0;
        }
        break;
      case 'waiting-children':
        // These are jobs waiting for child jobs to complete
        // They are a subset of waiting jobs, so we'll clean based on job state
        const waitingJobs = await queue.getJobs(['waiting'], 0, -1);
        const waitingChildrenJobs = waitingJobs.filter(job => job.opts?.parent);
        for (const job of waitingChildrenJobs) {
          await job.remove();
        }
        removedCount = waitingChildrenJobs.length;
        break;
      case 'prioritized':
        // These are jobs with priority > 0
        const prioritizedJobs = await queue.getJobs(['waiting'], 0, -1);
        const highPriorityJobs = prioritizedJobs.filter(job => (job.opts?.priority || 0) > 0);
        for (const job of highPriorityJobs) {
          await job.remove();
        }
        removedCount = highPriorityJobs.length;
        break;
      default:
        return NextResponse.json(
          { error: `State ${state} is not supported for reset operations` },
          { status: 400 },
        );
    }

    return NextResponse.json({ 
      success: true, 
      removedCount,
      message: `Successfully reset ${removedCount} jobs in state "${state}" from queue "${queueName}"` 
    });

  } catch (error) {
    console.error('Error resetting queue state:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

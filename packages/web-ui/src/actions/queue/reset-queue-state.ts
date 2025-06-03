'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { QueueName, QueueState } from 'shared/types';

const connection = new IORedis(
  process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
  {
    maxRetriesPerRequest: null,
  },
);

/**
 * Reset specific queue state jobs
 * @param queueName - Name of the queue
 * @param state - Job state to reset ('waiting', 'completed', 'failed', etc.)
 * @returns Boolean indicating success
 */
export async function resetQueueState(
  queueName: QueueName,
  state: QueueState,
): Promise<boolean> {
  try {
    const queue = new Queue(queueName, { connection });

    switch (state) {
      case 'completed':
        await queue.clean(0, 1000000, 'completed');
        break;
      case 'failed':
        await queue.clean(0, 1000000, 'failed');
        break;
      case 'waiting':
        // Clean both waiting and prioritized jobs, since they are used interchangeably in the UI
        await queue.clean(0, 1000000, 'wait');
        await queue.clean(0, 1000000, 'prioritized');
        break;
      case 'delayed':
        await queue.clean(0, 1000000, 'delayed');
        break;
      case 'paused':
        await queue.clean(0, 1000000, 'paused');
        break;
      default:
        console.error(`State ${state} is not supported for reset operations`);
        return false;
    }

    console.log(
      `Successfully reset state "${state}" from queue "${queueName}"`,
    );
    return true;
  } catch (error) {
    console.error('Error resetting queue state:', error);
    return false;
  }
}

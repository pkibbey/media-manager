'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

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
export async function resetQueueState(queueName: string, state: string): Promise<boolean> {
  try {
    // Validate state parameter - these are the valid BullMQ job states
    const validStates = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused', 'waiting-children', 'prioritized'];
    if (!validStates.includes(state)) {
      console.error(`Invalid state. Valid states are: ${validStates.join(', ')}`);
      return false;
    }

    const queue = new Queue(queueName, { connection });
    
    // Clean jobs by state
    let removedCount = 0;
    
    switch (state) {
      case 'completed':
        removedCount = await queue.clean(0, 1000000, 'completed') as unknown as number;
        break;
      case 'failed':
        removedCount = await queue.clean(0, 1000000, 'failed') as unknown as number;
        break;
      case 'waiting':
        removedCount = await queue.clean(0, 1000000, 'wait') as unknown as number;
        break;
      case 'delayed':
        removedCount = await queue.clean(0, 1000000, 'delayed') as unknown as number;
        break;
      case 'paused':
        removedCount = await queue.clean(0, 1000000, 'paused') as unknown as number;
        break;
      case 'prioritized':
        removedCount = await queue.clean(0, 1000000, 'prioritized') as unknown as number;
        break;
      default:
        console.error(`State ${state} is not supported for reset operations`);
        return false;
    }

    console.log(`Successfully reset ${removedCount} jobs in state "${state}" from queue "${queueName}"`);
    return true;

  } catch (error) {
    console.error('Error resetting queue state:', error);
    return false;
  }
}

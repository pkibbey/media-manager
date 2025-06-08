'use server';

import type { QueueName } from 'shared/types';
import { resetQueueState } from './reset-queue-state';

/**
 * Empty an entire queue by clearing all job states
 * @param queueName - Name of the queue to empty
 * @returns Boolean indicating success
 */
export async function emptyQueue(queueName: QueueName): Promise<boolean> {
  // All possible queue states that can be cleared
  const statesToClear = [
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed',
    'paused',
    'waiting-children',
    'prioritized',
  ] as const;

  try {
    console.log(`Starting to empty queue: ${queueName}`);

    // Reset all states for the queue
    for (const state of statesToClear) {
      await resetQueueState(queueName, state);
    }

    console.log(`Successfully emptied queue: ${queueName}`);
    return true;
  } catch (error) {
    console.error(`Error emptying queue ${queueName}:`, error);
    return false;
  }
}

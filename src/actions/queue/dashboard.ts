'use server';

import { QUEUE_NAMES } from '@/lib/queues';
import { getAllQueueStats, getJobStatus } from './queue-service';

export async function getDashboardData() {
  try {
    const queueStats = await getAllQueueStats();

    return {
      success: true,
      queues: queueStats,
      queueNames: Object.values(QUEUE_NAMES),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getJobDetails(queueName: string, jobId: string) {
  try {
    const jobStatus = await getJobStatus(queueName, jobId);

    return {
      success: true,
      job: jobStatus,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

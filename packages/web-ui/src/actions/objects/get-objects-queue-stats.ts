'use server';

import { getQueueStats } from '../queue/get-queue-stats';
import type { QueueStats } from '../queue/get-queue-stats';

interface ObjectAnalysisQueueStats extends QueueStats {
  // Add any object analysis specific stats if needed
}

export async function getObjectAnalysisQueueStats(): Promise<ObjectAnalysisQueueStats> {
  return await getQueueStats('objectAnalysisQueue');
}

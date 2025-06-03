'use server';

import { getQueueStats } from '../queue/get-queue-stats';
import type { QueueStats } from '../queue/get-queue-stats';

export interface AdvancedQueueStats extends QueueStats {
  // Add any advanced specific stats if needed
}

export async function getAdvancedQueueStats(): Promise<AdvancedQueueStats> {
  return await getQueueStats('advancedAnalysisQueue');
}

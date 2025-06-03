'use server';

import { getQueueStats } from '../queue/get-queue-stats';
import type { QueueStats } from '../queue/get-queue-stats';

export interface AdvancedAnalysisQueueStats extends QueueStats {
  // Add any advanced analysis specific stats if needed
}

export async function getAdvancedAnalysisQueueStats(): Promise<AdvancedAnalysisQueueStats> {
  return await getQueueStats('advancedAnalysisQueue');
}

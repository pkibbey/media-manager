'use server';

import type { QueueStats } from 'shared/types';
import { getQueueStats } from '../queue/get-queue-stats';

interface AdvancedQueueStats extends QueueStats {
  // Add any advanced specific stats if needed
}

export async function getAdvancedQueueStats(): Promise<AdvancedQueueStats> {
  return await getQueueStats('advancedAnalysisQueue');
}

'use client';

import { getAdvancedQueueStats } from '@/actions/advanced/get-advanced-queue-stats';
import { BrainCircuit } from 'lucide-react';
import { ActiveJobDisplay } from './active-job-display';
import { QueueStatus } from './queue-status';

export function AdvancedAnalysisQueueStatus() {
  return (
    <QueueStatus
      queueName="advancedAnalysisQueue"
      title="Advanced Analysis Queue"
      icon={BrainCircuit}
      fetchStats={getAdvancedQueueStats}
      renderActiveJob={(job) => <ActiveJobDisplay jobData={job.data} />}
      emptyStateDescription="No items in advanced analysis queue."
      supportedMethods={['standard']}
    />
  );
}

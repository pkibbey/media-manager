'use client';

import { getVisualHashQueueStats } from '@/actions/visual-hash/get-visual-hash-queue-stats';
import { Fingerprint } from 'lucide-react';
import { ActiveJobDisplay } from './active-job-display';
import { QueueStatus } from './queue-status';

export function VisualHashQueueStatus() {
  return (
    <QueueStatus
      queueName="visualHashQueue"
      title="Visual Hash Queue"
      icon={Fingerprint}
      fetchStats={getVisualHashQueueStats}
      renderActiveJob={(job) => <ActiveJobDisplay jobData={job.data} />}
      emptyStateDescription="No items in visual hash queue."
      supportedMethods={['standard']}
    />
  );
}

'use client';

import { getObjectAnalysisQueueStats } from '@/actions/objects/get-objects-queue-stats';
import { ScanSearch } from 'lucide-react';
import { ActiveJobDisplay } from './active-job-display';
import { QueueStatus } from './queue-status';

export function ObjectAnalysisQueueStatus() {
  return (
    <QueueStatus
      queueName="objectAnalysisQueue"
      title="Object Detection Queue"
      icon={ScanSearch}
      fetchStats={getObjectAnalysisQueueStats}
      renderActiveJob={(job) => <ActiveJobDisplay jobData={job.data} />}
      emptyStateDescription="No items in object detection queue."
      supportedMethods={['standard']}
    />
  );
}

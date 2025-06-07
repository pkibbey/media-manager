'use client';

import { getDuplicatesQueueStats } from '@/actions/duplicates/get-duplicates-queue-stats';
import { Copy } from 'lucide-react';
import { ActiveJobDisplay } from './active-job-display';
import { QueueStatus } from './queue-status';

export function DuplicatesQueueStatus() {
  return (
    <QueueStatus
      queueName="duplicatesQueue"
      title="Duplicate Detection Queue"
      icon={Copy}
      fetchStats={getDuplicatesQueueStats}
      renderActiveJob={(job) => <ActiveJobDisplay jobData={job.data} />}
      emptyStateDescription="No items in duplicate detection queue."
      supportedMethods={['standard', 'auto-delete']}
    />
  );
}

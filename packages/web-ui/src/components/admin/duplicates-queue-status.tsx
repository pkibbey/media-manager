'use client';

import { getDuplicatesQueueStats } from '@/actions/duplicates/get-duplicates-queue-stats';
import { Copy } from 'lucide-react';
import { QueueStatus } from './queue-status';

export function DuplicatesQueueStatus() {
  return (
    <QueueStatus
      queueName="duplicatesQueue"
      title="Duplicate Detection Queue"
      icon={Copy}
      fetchStats={getDuplicatesQueueStats}
      renderActiveJob={(job) => (
        <span className="truncate font-mono text-xs">
          Media ID: {job.data.id}
        </span>
      )}
      emptyStateDescription="No media items in duplicate detection queue."
    />
  );
}

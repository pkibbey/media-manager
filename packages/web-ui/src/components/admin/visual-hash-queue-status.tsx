'use client';

import { getVisualHashQueueStats } from '@/actions/visual-hash/get-visual-hash-queue-stats';
import { Hash } from 'lucide-react';
import { QueueStatus } from './queue-status';

export function VisualHashQueueStatus() {
  return (
    <QueueStatus
      queueName="visualHashQueue"
      title="Visual Hash Generation Queue"
      icon={Hash}
      fetchStats={getVisualHashQueueStats}
      renderActiveJob={(job) => (
        <span className="truncate font-mono text-xs">
          {job.data.thumbnail_url || `Media ID: ${job.data.id}`}
        </span>
      )}
      emptyStateDescription="No media items in visual hash generation queue."
      supportedMethods={['standard']}
    />
  );
}

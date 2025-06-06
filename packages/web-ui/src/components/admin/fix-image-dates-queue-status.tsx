'use client';

import { getFixImageDatesQueueStats } from '@/actions/fix-dates/get-fix-dates-queue-stats';
import { Calendar } from 'lucide-react';
import { QueueStatus } from './queue-status';

export function FixImageDatesQueueStatus() {
  return (
    <QueueStatus
      queueName="fixImageDatesQueue"
      title="Fix Image Dates Queue"
      icon={Calendar}
      fetchStats={getFixImageDatesQueueStats}
      renderActiveJob={(job) => (
        <span className="truncate font-mono text-xs">
          {job.data.media_path || `Media ID: ${job.data.id}`}
        </span>
      )}
      emptyStateDescription="No images in fix dates processing queue."
    />
  );
}

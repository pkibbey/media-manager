'use client';

import { getContentWarningsQueueStats } from '@/actions/warnings/get-warnings-queue-stats';
import { Shield } from 'lucide-react';
import { QueueStatus } from './queue-status';

export function ContentWarningsQueueStatus() {
  return (
    <QueueStatus
      queueName="contentWarningsQueue"
      title="Content Warnings Queue"
      icon={Shield}
      fetchStats={getContentWarningsQueueStats}
      supportedMethods={['standard']}
      renderActiveJob={(job) => (
        <span className="truncate font-mono text-xs">
          Media ID: {job.data.id}
        </span>
      )}
      emptyStateDescription="No media items in content warnings queue."
    />
  );
}

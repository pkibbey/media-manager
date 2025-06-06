'use client';

import { getObjectAnalysisQueueStats } from '@/actions/objects/get-objects-queue-stats';
import { Brain } from 'lucide-react';
import { QueueStatus } from './queue-status';

export function ObjectAnalysisQueueStatus() {
  return (
    <QueueStatus
      queueName="objectAnalysisQueue"
      title="Objects Queue"
      icon={Brain}
      fetchStats={getObjectAnalysisQueueStats}
      emptyStateDescription="No objects jobs in queue"
      renderActiveJob={(job) => (
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Media ID: {job.data.id}</div>
          {job.data.thumbnail_url && (
            <div className="truncate">
              Thumbnail: ...{job.data.thumbnail_url.slice(-30)}
            </div>
          )}
        </div>
      )}
      supportedMethods={['standard']}
    />
  );
}

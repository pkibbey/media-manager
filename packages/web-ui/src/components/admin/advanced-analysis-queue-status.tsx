'use client';

import { getAdvancedQueueStats } from '@/actions/advanced/get-advanced-queue-stats';
import { Sparkles } from 'lucide-react';
import { QueueStatus } from './queue-status';

export function AdvancedAnalysisQueueStatus() {
  return (
    <QueueStatus
      queueName="advancedAnalysisQueue"
      title="Advanced Analysis Queue"
      icon={Sparkles}
      fetchStats={getAdvancedQueueStats}
      emptyStateDescription="No advanced analysis jobs in queue"
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
      supportedMethods={['ollama']}
    />
  );
}

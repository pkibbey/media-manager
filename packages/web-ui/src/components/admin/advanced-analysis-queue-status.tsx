'use client';

import { getAdvancedAnalysisQueueStats } from '@/actions/advanced-analysis/get-advanced-analysis-queue-stats';
import { Sparkles } from 'lucide-react';
import { QueueStatus } from './queue-status';

export function AdvancedAnalysisQueueStatus() {
  return (
    <QueueStatus
      queueName="advancedAnalysisQueue"
      title="Advanced Analysis Queue"
      icon={Sparkles}
      fetchStats={getAdvancedAnalysisQueueStats}
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
    />
  );
}

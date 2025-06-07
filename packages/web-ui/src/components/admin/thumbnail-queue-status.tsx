'use client';

import { getThumbnailQueueStats } from '@/actions/thumbnails/get-thumbnail-queue-stats';
import { ImageIcon } from 'lucide-react';
import { ActiveJobDisplay } from './active-job-display';
import { QueueStatus } from './queue-status';

export function ThumbnailQueueStatus() {
  return (
    <QueueStatus
      queueName="thumbnailQueue"
      title="Thumbnail Generation Queue"
      icon={ImageIcon}
      fetchStats={getThumbnailQueueStats}
      renderActiveJob={(job) => <ActiveJobDisplay jobData={job.data} />}
      emptyStateDescription="No media items in thumbnail generation queue."
      supportedMethods={['ultra', 'fast', 'slow']}
    />
  );
}

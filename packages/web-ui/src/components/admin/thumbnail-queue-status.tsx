'use client';

import { getThumbnailQueueStats } from '@/actions/thumbnails/get-thumbnail-queue-stats';
import { ImageIcon } from 'lucide-react';
import { QueueStatus } from './queue-status';

export function ThumbnailQueueStatus() {
  return (
    <QueueStatus
      queueName="thumbnailQueue"
      title="Thumbnail Generation Queue"
      icon={ImageIcon}
      fetchStats={getThumbnailQueueStats}
      renderActiveJob={(job) => (
        <span className="truncate font-mono text-xs">
          {job.data.media_path || `Media ID: ${job.data.id}`}
        </span>
      )}
      emptyStateDescription="No media items in thumbnail generation queue."
    />
  );
}

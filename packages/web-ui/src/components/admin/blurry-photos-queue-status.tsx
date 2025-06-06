'use client';

import { getBlurryPhotosQueueStats } from '@/actions/blurry-photos/get-blurry-photos-queue-stats';
import { ImageOff } from 'lucide-react';
import { QueueStatus } from './queue-status';

export function BlurryPhotosQueueStatus() {
  return (
    <QueueStatus
      queueName="blurryPhotosQueue"
      title="Blurry Photos Queue"
      icon={ImageOff}
      fetchStats={getBlurryPhotosQueueStats}
      supportedMethods={['standard']}
      renderActiveJob={(job) => (
        <span className="truncate font-mono text-xs">
          {job.data.media_path || `Media ID: ${job.data.id}`}
        </span>
      )}
      emptyStateDescription="No images in blurry photos processing queue."
    />
  );
}

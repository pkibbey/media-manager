'use client';

import { getExifQueueStats } from '@/actions/exif/get-exif-queue-stats';
import { Camera } from 'lucide-react';
import { QueueStatus } from './queue-status';

export function ExifQueueStatus() {
  return (
    <QueueStatus
      queueName="exifQueue"
      title="EXIF Processing Queue Status"
      icon={Camera}
      fetchStats={getExifQueueStats}
      renderActiveJob={(job) => (
        <span className="truncate font-mono text-xs">
          {job.data.media_path || `Media ID: ${job.data.id}`}
        </span>
      )}
      emptyStateDescription="No media items in EXIF processing queue."
    />
  );
}

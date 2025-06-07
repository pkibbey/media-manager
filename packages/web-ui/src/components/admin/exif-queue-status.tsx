'use client';

import { getExifQueueStats } from '@/actions/exif/get-exif-queue-stats';
import { Camera } from 'lucide-react';
import { ActiveJobDisplay } from './active-job-display';
import { QueueStatus } from './queue-status';

export function ExifQueueStatus() {
  return (
    <QueueStatus
      queueName="exifQueue"
      title="EXIF Extraction Queue"
      icon={Camera}
      fetchStats={getExifQueueStats}
      renderActiveJob={(job) => <ActiveJobDisplay jobData={job.data} />}
      emptyStateDescription="No items in EXIF extraction queue."
      supportedMethods={['fast', 'slow']}
    />
  );
}

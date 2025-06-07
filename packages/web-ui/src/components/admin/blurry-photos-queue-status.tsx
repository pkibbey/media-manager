'use client';

import { getBlurryPhotosQueueStats } from '@/actions/blurry-photos/get-blurry-photos-queue-stats';
import { FileX2Icon } from 'lucide-react';
import { ActiveJobDisplay } from './active-job-display';
import { QueueStatus } from './queue-status';

export function BlurryPhotosQueueStatus() {
  return (
    <QueueStatus
      queueName="blurryPhotosQueue"
      title="Blurry Photo Detection Queue"
      icon={FileX2Icon}
      fetchStats={getBlurryPhotosQueueStats}
      renderActiveJob={(job) => <ActiveJobDisplay jobData={job.data} />}
      emptyStateDescription="No items in blurry photo detection queue."
      supportedMethods={['standard', 'auto-delete']}
    />
  );
}

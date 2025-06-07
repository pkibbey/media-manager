'use client';

import { getContentWarningsQueueStats } from '@/actions/warnings/get-warnings-queue-stats';
import { Shield } from 'lucide-react';
import { ActiveJobDisplay } from './active-job-display';
import { QueueStatus } from './queue-status';

export function ContentWarningsQueueStatus() {
  return (
    <QueueStatus
      queueName="contentWarningsQueue"
      title="Content Warnings Queue"
      icon={Shield}
      fetchStats={getContentWarningsQueueStats}
      renderActiveJob={(job) => <ActiveJobDisplay jobData={job.data} />}
      emptyStateDescription="No media items in content warnings queue."
      supportedMethods={['standard']}
    />
  );
}

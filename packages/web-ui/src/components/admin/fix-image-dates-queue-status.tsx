'use client';

import { getFixImageDatesQueueStats } from '@/actions/fix-dates/get-fix-dates-queue-stats';
import { CalendarClock } from 'lucide-react';
import { ActiveJobDisplay } from './active-job-display';
import { QueueStatus } from './queue-status';

export function FixImageDatesQueueStatus() {
  return (
    <QueueStatus
      queueName="fixImageDatesQueue"
      title="Fix Image Dates Queue"
      icon={CalendarClock}
      fetchStats={getFixImageDatesQueueStats}
      renderActiveJob={(job) => <ActiveJobDisplay jobData={job.data} />}
      emptyStateDescription="No items in fix image dates queue."
      supportedMethods={['standard']}
    />
  );
}

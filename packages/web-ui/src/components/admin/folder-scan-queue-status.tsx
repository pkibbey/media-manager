'use client';

import { getFolderScanQueueStats } from '@/actions/folder-scan/get-folder-scan-queue-stats';
import { FolderSearch } from 'lucide-react';
import { ActiveJobDisplay } from './active-job-display';
import { QueueStatus } from './queue-status';

export function FolderScanQueueStatus() {
  return (
    <QueueStatus
      queueName="folderScanQueue"
      title="Folder Scanning Queue"
      icon={FolderSearch}
      fetchStats={getFolderScanQueueStats}
      renderActiveJob={(job) => <ActiveJobDisplay jobData={job.data} />}
      emptyStateDescription="No items in folder scanning queue."
      supportedMethods={['standard']}
    />
  );
}

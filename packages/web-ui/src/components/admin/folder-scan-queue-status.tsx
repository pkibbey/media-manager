'use client';

import { getFolderScanQueueStats } from '@/actions/folder-scan/get-folder-scan-queue-stats';
import { FolderOpen } from 'lucide-react';
import { QueueStatus } from './queue-status';

export function FolderScanQueueStatus() {
  return (
    <QueueStatus
      queueName="folderScanQueue"
      title="Folder Scan Queue"
      icon={FolderOpen}
      fetchStats={getFolderScanQueueStats}
      renderActiveJob={(job) => (
        <span className="truncate font-mono text-xs">
          {job.data.folderPath || 'Unknown folder'}
        </span>
      )}
      emptyStateDescription="No folders in scan queue. Add folders above to start scanning."
      dynamicGrowthMessage="Queue growing as subdirectories are discovered..."
      showDynamicGrowth={true}
    />
  );
}

'use client';

import { Progress } from '@/components/ui/progress';
import { UnifiedProgressDisplay } from '@/components/ui/unified-progress-display';
import { UnifiedStatsDisplay } from '@/components/ui/unified-stats-display';
import { ScanButton } from './ScanButton';
import { useScanFolders } from './useScanFolders';

export function ScanFoldersTrigger() {
  const {
    stats,
    progress,
    isScanning,
    startScan,
    cancelScan,
    processedPercentages,
  } = useScanFolders();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 items-start">
        <div>
          <h3 className="text-lg font-medium">Scan Folders</h3>
          <p className="text-sm text-muted-foreground">
            Scans all configured folders for media files and adds them to the
            database. Unchanged files will be skipped to improve performance.
          </p>
        </div>

        {!isScanning && stats && (
          <UnifiedStatsDisplay
            stats={stats}
            title={''}
            description={''}
            className="w-full"
          />
        )}

        {isScanning && (
          <Progress value={processedPercentages.completed} className="h-2" />
        )}

        <ScanButton
          isScanning={isScanning}
          onScan={startScan}
          onCancel={cancelScan}
          canCancel={true}
        />
      </div>

      {progress && (
        <UnifiedProgressDisplay
          stats={stats}
          progress={progress}
          isProcessing={isScanning}
          itemsLabel="files"
          title="Scanning Folders"
          rateUnit="files/sec"
        />
      )}
    </div>
  );
}

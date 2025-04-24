import { Progress } from '@/components/ui/progress';
import { ScanButton } from './ScanButton';
import { ScanProgress } from './ScanProgress';
import { useScanFolders } from './useScanFolders';

export function ScanFoldersTriggerContainer() {
  const { isScanning, progress, startScan, cancelScan } = useScanFolders();

  const progressPercent =
    progress?.status === 'processing' &&
    progress.filesDiscovered !== undefined &&
    progress.filesProcessed !== undefined
      ? (progress.filesProcessed / Math.max(progress.filesDiscovered, 1)) * 100
      : 0;

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

        <Progress value={progressPercent} className="h-2" />

        <ScanButton
          isScanning={isScanning}
          onScan={startScan}
          onCancel={cancelScan}
          canCancel={true}
        />
      </div>

      {progress && <ScanProgress progress={progress} />}
    </div>
  );
}

import { ScanButton } from './ScanButton';
import { ScanOptions } from './ScanOptions';
import { ScanProgress } from './ScanProgress';
import { useScanFolders } from './useScanFolders';

export function ScanFoldersTriggerContainer() {
  const {
    isScanning,
    progress,
    ignoreSmallFiles,
    setIgnoreSmallFiles,
    startScan,
    cancelScan,
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

        <ScanOptions
          ignoreSmallFiles={ignoreSmallFiles}
          setIgnoreSmallFiles={setIgnoreSmallFiles}
          isDisabled={isScanning}
        />

        <ScanButton
          isScanning={isScanning}
          onScan={startScan}
          onCancel={cancelScan}
          canCancel={true}
        />
      </div>

      <ScanProgress progress={progress} />
    </div>
  );
}

import { Progress } from '@/components/ui/progress';
import type { ScanProgress as ScanProgressType } from '@/types/progress-types';

type ScanProgressProps = {
  progress: ScanProgressType;
};

export function ScanProgress({ progress }: ScanProgressProps) {
  const progressPercent =
    progress.status === 'processing' &&
    progress.filesDiscovered !== undefined &&
    progress.filesProcessed !== undefined
      ? (progress.filesProcessed / Math.max(progress.filesDiscovered, 1)) * 100
      : 0;

  return (
    <div
      className={`border rounded-md p-4 ${
        progress.status === 'error' ? 'bg-destructive/10' : 'bg-muted'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4
          className={`font-medium ${
            progress.status === 'error' ? 'text-destructive' : ''
          }`}
        >
          {progress.status === 'processing' && 'Scanning folders...'}
          {progress.status === 'success' && 'Scan complete'}
          {progress.status === 'error' && 'Scan error'}
        </h4>
        <span className="text-xs text-muted-foreground">
          {progress.status === 'processing' &&
            progress.filesDiscovered &&
            progress.filesProcessed &&
            `${progress.filesProcessed}/${progress.filesDiscovered} files`}
        </span>
      </div>

      <div className="text-sm mb-2">{progress.message}</div>

      {/* Progress bar */}
      {progress.status === 'processing' &&
        progress.filesDiscovered !== undefined &&
        progress.filesProcessed !== undefined && (
          <Progress value={progressPercent} className="h-2" />
        )}

      {/* Additional statistics in a grid layout for better organization */}
      {(progress.filesProcessed !== undefined ||
        progress.newFilesAdded !== undefined ||
        progress.filesSkipped !== undefined) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-sm border-t border-border/30 pt-2">
          {progress.filesProcessed !== undefined && (
            <div>
              <div className="text-xs text-muted-foreground">Processed</div>
              <div className="font-medium">{progress.filesProcessed}</div>
            </div>
          )}

          {progress.newFilesAdded !== undefined && (
            <div>
              <div className="text-xs text-muted-foreground">New/Updated</div>
              <div className="font-medium">{progress.newFilesAdded}</div>
            </div>
          )}

          {progress.filesSkipped !== undefined && (
            <div>
              <div className="text-xs text-muted-foreground">Skipped</div>
              <div className="font-medium">{progress.filesSkipped}</div>
            </div>
          )}
        </div>
      )}

      {/* New file types discovered */}
      {progress.newFileTypes && progress.newFileTypes.length > 0 && (
        <div className="mt-3 border-t border-border/30 pt-2">
          <div className="text-xs text-muted-foreground">
            Discovered {progress.newFileTypes.length} new file types:
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {progress.newFileTypes.map((type) => (
              <span
                key={type}
                className="text-xs px-2 py-1 bg-secondary rounded-md"
              >
                .{type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error details */}
      {progress.error && (
        <div className="text-xs text-destructive mt-2">{progress.error}</div>
      )}
    </div>
  );
}

import type { UnifiedProgress } from '@/types/progress-types';

type ExifErrorSummaryProps = {
  progress: UnifiedProgress | null;
  errorSummary: string[];
};

export function ExifErrorSummary({
  progress,
  errorSummary,
}: ExifErrorSummaryProps) {
  const shouldShowErrors =
    (progress?.failureCount && progress.failureCount > 0) ||
    Object.keys(errorSummary).length > 0;

  if (!shouldShowErrors) return null;

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <h3 className="text-sm font-medium mb-2">EXIF Parsing Failure Summary</h3>

      {Object.keys(errorSummary).length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {progress?.failureCount} files failed, but detailed information is not
          available.
        </p>
      ) : (
        <ul className="space-y-3">
          {errorSummary.map((error, index) => (
            <li key={error + index} className="text-xs">
              <div className="truncate text-[10px] font-medium text-muted-foreground">
                {error}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import type { ExifProgress } from '@/types/exif';
import type { ErrorSummary } from './useExifProcessor';

type ExifErrorSummaryProps = {
  progress: ExifProgress | null;
  errorSummary: ErrorSummary;
};

export function ExifErrorSummary({
  progress,
  errorSummary,
}: ExifErrorSummaryProps) {
  const shouldShowErrors =
    (progress?.failedCount && progress.failedCount > 0) ||
    Object.keys(errorSummary).length > 0;

  if (!shouldShowErrors) return null;

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <h3 className="text-sm font-medium mb-2">EXIF Parsing Failure Summary</h3>

      {Object.keys(errorSummary).length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {progress?.failedCount} files failed, but detailed information is not
          available.
        </p>
      ) : (
        <ul className="space-y-3">
          {Object.entries(errorSummary)
            .sort(([, a], [, b]) => b.count - a.count) // Sort by count (highest first)
            .map(([errorType, details]) => (
              <li key={errorType} className="text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{errorType}:</span>
                  <span>
                    {details.count} {details.count === 1 ? 'file' : 'files'}
                  </span>
                </div>
                {details.examples.length > 0 && (
                  <div className="mt-1 text-muted-foreground">
                    <div className="text-xs mb-1">Examples:</div>
                    {details.examples.map((example, i) => (
                      <div key={i} className="truncate pl-2 text-[10px]">
                        {example.split('/').pop()}
                        {/* Show just the filename */}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

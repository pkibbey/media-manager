type ErrorSummary = {
  [errorType: string]: {
    count: number;
    examples: string[];
  };
};

type ThumbnailErrorSummaryProps = {
  failedCount: number;
  errorSummary: ErrorSummary;
};

export function ThumbnailErrorSummary({
  failedCount,
  errorSummary,
}: ThumbnailErrorSummaryProps) {
  if (failedCount === 0 || Object.keys(errorSummary).length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <h3 className="text-sm font-medium mb-2">
        Thumbnail Generation Failure Summary
      </h3>

      <ul className="space-y-3">
        {Object.entries(errorSummary)
          .sort(([, a], [, b]) => b.count - a.count)
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
                    <div
                      key={`${errorType}-example-${i}-${example.substring(0, 10)}`}
                      className="truncate pl-2 text-[10px]"
                    >
                      {example}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
      </ul>
    </div>
  );
}

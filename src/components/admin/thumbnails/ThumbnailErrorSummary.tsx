type ThumbnailErrorSummaryProps = {
  failureCount: number;
  errorSummary: string[];
};

export function ThumbnailErrorSummary({
  failureCount,
  errorSummary,
}: ThumbnailErrorSummaryProps) {
  if (failureCount === 0 || errorSummary.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <h3 className="text-sm font-medium mb-2">
        Thumbnail Generation Failure Summary
      </h3>

      <ul className="space-y-3">
        {errorSummary.map((error, index) => (
          <li
            key={`thumbnail-error-${index}-${error.substring(0, 20)}`}
            className="text-xs"
          >
            <div className="truncate pl-2 text-[10px]">{error}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

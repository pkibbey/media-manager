import { Button } from '@/components/ui/button';
import type { Method, UnifiedStats } from '@/types/unified-stats';

type ThumbnailActionButtonsProps = {
  isProcessing: boolean;
  stats: UnifiedStats;
  batchSize: number;
  method: Method;
  onGenerateThumbnails: ({
    processAll,
  }: {
    processAll: boolean;
  }) => Promise<void>;
  onCancel: () => void;
};

export function ThumbnailActionButtons({
  isProcessing,
  stats,
  batchSize,
  method,
  onGenerateThumbnails,
  onCancel,
}: ThumbnailActionButtonsProps) {
  const totalCount = stats?.counts?.total || 0;
  const processedCount =
    (stats?.counts?.success || 0) + (stats?.counts?.failed || 0);
  const filesPending = totalCount - processedCount;

  const methodLabel =
    {
      default: 'Full Processing',
      'embedded-preview': 'Using Embedded Previews',
      'downscale-only': 'Downscale Only',
      'direct-only': 'Direct Only',
      'marker-only': 'Marker Only',
      'sharp-only': 'Sharp Only',
    }[method] || 'Full Processing';

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={() => onGenerateThumbnails({ processAll: false })}
        disabled={isProcessing || !stats}
      >
        {!stats
          ? 'Loading...'
          : isProcessing
            ? 'Processing...'
            : `Generate ${Math.min(batchSize, filesPending)} Thumbnails (${methodLabel})`}
      </Button>

      {isProcessing && (
        <Button onClick={onCancel} variant="destructive">
          Cancel
        </Button>
      )}
    </div>
  );
}

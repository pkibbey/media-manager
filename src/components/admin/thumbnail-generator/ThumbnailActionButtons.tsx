import { Button } from '@/components/ui/button';
import type { UnifiedStats } from '@/types/unified-stats';

type ThumbnailActionButtonsProps = {
  isProcessing: boolean;
  isProcessingAll: boolean;
  stats: UnifiedStats | null;
  batchSize: number;
  onGenerateThumbnails: (processAll: boolean) => Promise<void>;
  onCancel: () => void;
};

export function ThumbnailActionButtons({
  isProcessing,
  isProcessingAll,
  stats,
  batchSize,
  onGenerateThumbnails,
  onCancel,
}: ThumbnailActionButtonsProps) {
  const totalCount = stats?.counts?.total || 0;
  const processedCount =
    (stats?.counts?.success || 0) + (stats?.counts?.failed || 0);
  const filesPending = totalCount - processedCount;

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={() => onGenerateThumbnails(false)}
        disabled={isProcessing || !stats}
      >
        {!stats
          ? 'Loading...'
          : isProcessing && !isProcessingAll
            ? 'Generating...'
            : `Generate ${Math.min(batchSize, filesPending)} Thumbnails`}
      </Button>

      {isProcessing && (
        <Button onClick={onCancel} variant="destructive">
          Cancel
        </Button>
      )}
    </div>
  );
}

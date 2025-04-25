import { Button } from '@/components/ui/button';

type ThumbnailActionButtonsProps = {
  isProcessing: boolean;
  isProcessingAll: boolean;
  thumbnailStats: {
    totalCompatibleFiles: number;
    filesWithThumbnails: number;
    filesPending: number;
    skippedLargeFiles: number;
  } | null;
  batchSize: number;
  onGenerateThumbnails: (processAll: boolean) => Promise<void>;
  onCancel: () => void;
};

export function ThumbnailActionButtons({
  isProcessing,
  isProcessingAll,
  thumbnailStats,
  batchSize,
  onGenerateThumbnails,
  onCancel,
}: ThumbnailActionButtonsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={() => onGenerateThumbnails(false)}
        disabled={
          isProcessing ||
          !thumbnailStats ||
          (thumbnailStats && thumbnailStats.filesPending === 0)
        }
      >
        {!thumbnailStats
          ? 'Loading...'
          : thumbnailStats.filesPending === 0 && !isProcessing
            ? 'All Thumbnails Generated'
            : isProcessing && !isProcessingAll
              ? 'Generating...'
              : `Generate ${Math.min(batchSize, thumbnailStats?.filesPending || 0)} Thumbnails`}
      </Button>

      {isProcessing && (
        <Button onClick={onCancel} variant="destructive">
          Cancel
        </Button>
      )}
    </div>
  );
}

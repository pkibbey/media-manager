import { Button } from '@/components/ui/button';

type ThumbnailActionButtonsProps = {
  isGenerating: boolean;
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
  isGenerating,
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
          isGenerating ||
          !thumbnailStats ||
          (thumbnailStats && thumbnailStats.filesPending === 0)
        }
      >
        {!thumbnailStats
          ? 'Loading...'
          : thumbnailStats.filesPending === 0 && !isGenerating
            ? 'All Thumbnails Generated'
            : isGenerating && !isProcessingAll
              ? 'Generating...'
              : `Generate ${Math.min(batchSize, thumbnailStats?.filesPending || 0)} Thumbnails`}
      </Button>

      <Button
        onClick={() => onGenerateThumbnails(true)}
        disabled={
          isGenerating ||
          !thumbnailStats ||
          (thumbnailStats && thumbnailStats.filesPending === 0)
        }
        variant="secondary"
      >
        {!thumbnailStats
          ? 'Loading...'
          : thumbnailStats.filesPending === 0
            ? 'All Thumbnails Generated'
            : isGenerating && isProcessingAll
              ? 'Processing All...'
              : `Process All (${thumbnailStats?.filesPending || 0} Remaining)`}
      </Button>

      {isGenerating && (
        <Button onClick={onCancel} variant="destructive">
          Cancel
        </Button>
      )}
    </div>
  );
}

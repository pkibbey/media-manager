import { Button } from '@/components/ui/button';
import type { ExifStatsResult } from '@/types/db-types';
import type { ExtractionMethod } from '@/types/exif';

type ExifActionButtonsProps = {
  isStreaming: boolean;
  totalUnprocessed: number;
  stats: ExifStatsResult;
  batchSize: number;
  extractionMethod: ExtractionMethod;
  handleProcess: () => Promise<void>;
  handleCancel: () => void;
};

export function ExifActionButtons({
  isStreaming,
  totalUnprocessed,
  stats,
  batchSize,
  extractionMethod,
  handleProcess,
  handleCancel,
}: ExifActionButtonsProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleProcess}
        disabled={isStreaming || totalUnprocessed === 0}
        className="w-full"
      >
        {stats.total === 0
          ? 'No Files To Process'
          : isStreaming
            ? `Processing Batch (${extractionMethod})...`
            : `Process Next ${batchSize} Files (${extractionMethod})`}
      </Button>

      {/* Cancel button if processing */}
      {isStreaming && (
        <Button onClick={handleCancel} variant="destructive" className="w-full">
          Cancel Processing
        </Button>
      )}
    </div>
  );
}

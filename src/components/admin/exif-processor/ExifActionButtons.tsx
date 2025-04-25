import { Button } from '@/components/ui/button';
import type { ExifStatsResult } from '@/types/db-types';
import type { ExtractionMethod } from '@/types/exif';

type ExifActionButtonsProps = {
  isProcessing: boolean;
  stats: ExifStatsResult | null;
  batchSize: number;
  extractionMethod: ExtractionMethod;
  handleProcess: () => Promise<void>;
  handleCancel: () => void;
};

export function ExifActionButtons({
  isProcessing,
  stats,
  batchSize,
  extractionMethod,
  handleProcess,
  handleCancel,
}: ExifActionButtonsProps) {
  const totalUnprocessed = stats
    ? stats.total - (stats.with_exif + stats.with_errors)
    : 0;

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleProcess}
        disabled={isProcessing || totalUnprocessed === 0}
        className="w-full"
      >
        {!stats?.total
          ? 'No Files To Process'
          : isProcessing
            ? `Processing Batch (${extractionMethod})...`
            : `Process Next ${batchSize} Files (${extractionMethod})`}
      </Button>

      {/* Cancel button if processing */}
      {isProcessing && (
        <Button onClick={handleCancel} variant="destructive" className="w-full">
          Cancel Processing
        </Button>
      )}
    </div>
  );
}

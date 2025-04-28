import { Button } from '@/components/ui/button';
import type { ExtractionMethod } from '@/types/exif';
import type { UnifiedStats } from '@/types/unified-stats';

type ExifActionButtonsProps = {
  stats: UnifiedStats;
  isProcessing: boolean;
  batchSize: number;
  method: ExtractionMethod;
  handleProcess: () => Promise<void>;
  handleCancel: () => void;
};

export function ExifActionButtons({
  stats,
  isProcessing,
  batchSize,
  method,
  handleProcess,
  handleCancel,
}: ExifActionButtonsProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleProcess}
        disabled={isProcessing || stats?.counts.total === 0}
        className="w-full"
      >
        {!stats?.counts.total
          ? 'No Files To Process'
          : isProcessing
            ? `Processing Batch (${method})...`
            : `Process Next ${batchSize} Files (${method})`}
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

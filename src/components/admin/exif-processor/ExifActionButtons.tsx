import { Button } from '@/components/ui/button';
import type { ExtractionMethod } from '@/types/exif';
import type { UnifiedStats } from '@/types/unified-stats';

type ExifActionButtonsProps = {
  stats: UnifiedStats | null;
  isProcessing: boolean;
  batchSize: number;
  extractionMethod: ExtractionMethod;
  handleProcess: () => Promise<void>;
  handleCancel: () => void;
};

export function ExifActionButtons({
  stats,
  isProcessing,
  batchSize,
  extractionMethod,
  handleProcess,
  handleCancel,
}: ExifActionButtonsProps) {
  console.log('stats: ', stats?.counts);

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

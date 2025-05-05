import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AnalysisActionButtonsProps = {
  isProcessing: boolean;
  hasItems: boolean;
  onStart: ({ processAll }: { processAll: boolean }) => Promise<void>;
  onCancel: () => void;
  onRefresh: () => Promise<void>;
};

export function AnalysisActionButtons({
  isProcessing,
  hasItems,
  onStart,
  onCancel,
  onRefresh,
}: AnalysisActionButtonsProps) {
  return (
    <div className="flex gap-2 flex-wrap mt-4">
      <Button
        onClick={() => onStart({ processAll: false })}
        disabled={isProcessing || !hasItems}
      >
        {!hasItems
          ? 'No Images To Analyze'
          : isProcessing
            ? 'Analyzing...'
            : 'Analyze Next Batch'}
      </Button>

      <Button
        onClick={() => onStart({ processAll: true })}
        disabled={isProcessing || !hasItems}
        variant="secondary"
      >
        Analyze All Images
      </Button>

      {isProcessing ? (
        <Button onClick={onCancel} variant="destructive">
          Cancel Analysis
        </Button>
      ) : (
        <Button onClick={onRefresh} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

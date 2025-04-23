import {
  CalendarIcon,
  RotateCounterClockwiseIcon,
  StopIcon,
} from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';

type CorrectionActionsProps = {
  isProcessing: boolean;
  needsCorrection: number;
  onUpdateTimestamps: () => Promise<void>;
  onStopProcessing: () => void;
};

export function CorrectionActions({
  isProcessing,
  needsCorrection,
  onUpdateTimestamps,
  onStopProcessing,
}: CorrectionActionsProps) {
  return (
    <div className="flex gap-2 pt-2">
      <Button
        onClick={onUpdateTimestamps}
        disabled={isProcessing || needsCorrection === 0}
        variant="default"
        className="flex-grow"
      >
        {isProcessing ? (
          <RotateCounterClockwiseIcon className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CalendarIcon className="mr-2 h-4 w-4" />
        )}
        {isProcessing
          ? 'Processing...'
          : needsCorrection === 0
            ? 'No Files Need Correction'
            : 'Correct Timestamps'}
      </Button>

      {isProcessing && (
        <Button
          onClick={onStopProcessing}
          variant="destructive"
          className="flex-shrink-0"
        >
          <StopIcon className="mr-2 h-4 w-4" />
          Stop
        </Button>
      )}
    </div>
  );
}

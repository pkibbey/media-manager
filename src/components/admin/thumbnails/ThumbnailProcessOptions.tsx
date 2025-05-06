import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UnifiedProgress } from '@/types/progress-types';
import type { Method } from '@/types/unified-stats';
import { ThumbnailBatchControls } from './ThumbnailBatchControls';

type ThumbnailProcessOptionsProps = {
  progress: UnifiedProgress | null;
  method: Method;
  setMethod: (method: Method) => void;
  batchSize: number;
  setBatchSize: (size: number) => void;
  isProcessing: boolean;
};

export function ThumbnailProcessOptions({
  method,
  progress,
  setMethod,
  batchSize,
  setBatchSize,
  isProcessing,
}: ThumbnailProcessOptionsProps) {
  return (
    <div className="flex flex-col items-start gap-6">
      <div className="flex gap-4 flex-wrap">
        <div className="flex flex-col space-y-2 gap-2 justify-center">
          <Label htmlFor="method" className="text-sm font-medium mb-0">
            Method:
          </Label>
          <Select
            value={method}
            onValueChange={(value) => setMethod(value as Method)}
            disabled={isProcessing || progress?.totalCount === 0}
          >
            <SelectTrigger className="w-full text-sm" id="method">
              <SelectValue placeholder="Select generation method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (Full Processing)</SelectItem>
              <SelectItem value="embedded-preview">Embedded Preview</SelectItem>
              <SelectItem value="downscale-only">Downscale Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ThumbnailBatchControls
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
}

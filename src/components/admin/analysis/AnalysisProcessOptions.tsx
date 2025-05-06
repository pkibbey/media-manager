import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { UnifiedProgress } from '@/types/progress-types';
import type { Method } from '@/types/unified-stats';

type AnalysisProcessOptionsProps = {
  progress: UnifiedProgress | null;
  method: Method;
  setMethod: (method: Method) => void;
  batchSize: number;
  setBatchSize: (size: number) => void;
  disabled: boolean;
};

export function AnalysisProcessOptions({
  method,
  progress,
  setMethod,
  batchSize,
  setBatchSize,
  disabled,
}: AnalysisProcessOptionsProps) {
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
            disabled={disabled || progress?.totalCount === 0}
          >
            <SelectTrigger className="w-full text-sm" id="method">
              <SelectValue placeholder="Select analysis method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (Basic Features)</SelectItem>
              <SelectItem value="comprehensive">
                Comprehensive Analysis
              </SelectItem>
              <SelectItem value="fast">Fast Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-2 min-w-[220px]">
          <div className="flex justify-between">
            <Label htmlFor="batchSize" className="text-sm font-medium">
              Batch Size: {batchSize}
            </Label>
          </div>
          <Slider
            id="batchSize"
            min={10}
            max={500}
            step={10}
            value={[batchSize]}
            onValueChange={([value]) => setBatchSize(value)}
            disabled={disabled}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

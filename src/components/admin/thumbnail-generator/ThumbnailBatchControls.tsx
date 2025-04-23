import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LARGE_FILE_THRESHOLD } from '@/lib/consts';

type ThumbnailBatchControlsProps = {
  skipLargeFiles: boolean;
  setSkipLargeFiles: (skip: boolean) => void;
  batchSize: number;
  setBatchSize: (size: number) => void;
  isGenerating: boolean;
};

export function ThumbnailBatchControls({
  skipLargeFiles,
  setSkipLargeFiles,
  batchSize,
  setBatchSize,
  isGenerating,
}: ThumbnailBatchControlsProps) {
  return (
    <>
      <div className="flex items-center space-x-2 mt-2">
        <Checkbox
          id="skipLargeFiles"
          checked={skipLargeFiles}
          onCheckedChange={(checked) => setSkipLargeFiles(checked as boolean)}
        />
        <Label htmlFor="skipLargeFiles" className="text-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dotted border-gray-400">
                  {`Skip large files (over ${Math.round(
                    LARGE_FILE_THRESHOLD / 1024 / 1024,
                  )}MB)`}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Large files can take a long time to process and may cause
                  timeouts. Checking this will improve processing speed.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
      </div>

      <div className="flex flex-col space-y-2 gap-2 items-start">
        <Label htmlFor="batchSize" className="text-sm font-medium mb-0">
          Batch Size:
        </Label>
        <Select        
          value={
            batchSize === Number.POSITIVE_INFINITY
              ? 'Infinity'
              : batchSize.toString()
          }
          onValueChange={(value) =>
            setBatchSize(
              value === 'Infinity' ? Number.POSITIVE_INFINITY : Number(value),
            )
          }
          disabled={isGenerating}
        >
          <SelectTrigger className="w-full text-sm" id="batchSize">
            <SelectValue placeholder="Select batch size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="500">500</SelectItem>
            <SelectItem value="1000">1000</SelectItem>
            <SelectItem value="Infinity">All Files</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

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
import type { ExtractionMethod } from '@/types/exif';

type ExifProcessOptionsProps = {
  skipLargeFiles: boolean;
  setSkipLargeFiles: (skip: boolean) => void;
  extractionMethod: ExtractionMethod;
  setExtractionMethod: (method: ExtractionMethod) => void;
  batchSize: number;
  setBatchSize: (size: number) => void;
  isStreaming: boolean;
  totalUnprocessed: number;
};

export function ExifProcessOptions({
  skipLargeFiles,
  setSkipLargeFiles,
  extractionMethod,
  setExtractionMethod,
  batchSize,
  setBatchSize,
  isStreaming,
  totalUnprocessed,
}: ExifProcessOptionsProps) {
  return (
    <div className="flex flex-col items-start gap-6 mt-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="skipLargeFiles"
          checked={skipLargeFiles}
          onCheckedChange={(checked) => setSkipLargeFiles(checked as boolean)}
          disabled={isStreaming || totalUnprocessed === 0}
        />
        <Label htmlFor="skipLargeFiles" className="text-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dotted border-gray-400">
                  Skip large files (over 100MB)
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Large files can take a long time to process and often don't
                  contain useful EXIF data. Checking this will improve
                  processing speed.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
      </div>
      <div className="flex gap-4 flex-col">
        <div className="flex space-y-2 gap-2 justify-center">
          <Label
            htmlFor="extractionMethod"
            className="text-sm font-medium mb-0"
          >
            Method:
          </Label>
          <Select
            value={extractionMethod}
            onValueChange={(value) =>
              setExtractionMethod(value as ExtractionMethod)
            }
            disabled={isStreaming || totalUnprocessed === 0}
          >
            <SelectTrigger className="w-full text-sm" id="extractionMethod">
              <SelectValue placeholder="Select extraction method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (Sharp Library)</SelectItem>
              <SelectItem value="direct-only">Direct Extraction</SelectItem>
              <SelectItem value="marker-only">
                Marker-based Extraction
              </SelectItem>
            </SelectContent>
          </Select>
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
            disabled={isStreaming || totalUnprocessed === 0}
          >
            <SelectTrigger className="text-sm w-full" id="batchSize">
              <SelectValue placeholder="Select batch size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="500">500</SelectItem>
              <SelectItem value="1000">1000</SelectItem>
              <SelectItem value="Infinity">All Files</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

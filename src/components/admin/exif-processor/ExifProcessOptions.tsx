import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ExtractionMethod } from '@/types/exif';
import type { UnifiedProgress } from '@/types/progress-types';

type ExifProcessOptionsProps = {
  progress: UnifiedProgress | null;
  extractionMethod: ExtractionMethod;
  setExtractionMethod: (method: ExtractionMethod) => void;
  batchSize: number;
  setBatchSize: (size: number) => void;
  isProcessing: boolean;
};

export function ExifProcessOptions({
  extractionMethod,
  progress,
  setExtractionMethod,
  batchSize,
  setBatchSize,
  isProcessing,
}: ExifProcessOptionsProps) {
  return (
    <div className="flex flex-col items-start gap-6">
      <div className="flex gap-4">
        <div className="flex flex-col space-y-2 gap-2 justify-center">
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
            disabled={isProcessing || progress?.totalCount === 0}
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
            disabled={isProcessing}
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

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ThumbnailBatchControlsProps = {
  batchSize: number;
  setBatchSize: (size: number) => void;
  isProcessing: boolean;
};

export function ThumbnailBatchControls({
  batchSize,
  setBatchSize,
  isProcessing,
}: ThumbnailBatchControlsProps) {
  return (
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
  );
}

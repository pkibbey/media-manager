import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type ScanOptionsProps = {
  ignoreSmallFiles: boolean;
  setIgnoreSmallFiles: (value: boolean) => void;
  isDisabled: boolean;
};

export function ScanOptions({
  ignoreSmallFiles,
  setIgnoreSmallFiles,
  isDisabled,
}: ScanOptionsProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="ignoreSmallFiles"
        checked={ignoreSmallFiles}
        onCheckedChange={setIgnoreSmallFiles}
        disabled={isDisabled}
      />
      <Label
        htmlFor="ignoreSmallFiles"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Ignore files (under 10Kb)
      </Label>
    </div>
  );
}

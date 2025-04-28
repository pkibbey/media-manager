import type { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import type { MediaFilters } from '@/types/media-types';

type FileSizeFilterProps = {
  form: UseFormReturn<MediaFilters>;
  maxFileSize: number;
  applyFilters: (values: MediaFilters) => void;
};

export function FileSizeFilter({
  form,
  maxFileSize,
  applyFilters,
}: FileSizeFilterProps) {
  // Get form values with fallbacks to prevent undefined values
  const minSize = form.getValues('minSize') ?? 0;
  const maxSize = form.getValues('maxSize') ?? maxFileSize;

  return (
    <FormField
      control={form.control}
      name="minSize"
      render={() => (
        <FormItem className="col-span-full">
          <div className="flex justify-between">
            <FormLabel>File Size Range</FormLabel>
            <span className="text-xs text-muted-foreground">
              {minSize}MB - {maxSize}MB
            </span>
          </div>
          <Slider
            min={0}
            max={maxFileSize}
            step={1}
            value={[minSize, maxSize]}
            onValueChange={(values) => {
              form.setValue('minSize', values[0]);
              form.setValue('maxSize', values[1]);
            }}
            onValueCommit={(values) => {
              form.setValue('minSize', values[0]);
              form.setValue('maxSize', values[1]);
              applyFilters(form.getValues());
            }}
            className="py-4"
          />
        </FormItem>
      )}
    />
  );
}

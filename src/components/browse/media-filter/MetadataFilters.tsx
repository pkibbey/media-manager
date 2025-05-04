import type { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MediaFilters } from '@/types/media-types';

type MetadataFiltersProps = {
  form: UseFormReturn<MediaFilters>;
  debouncedApplyFilters: (values: MediaFilters) => void;
};

export function MetadataFilters({ form, debouncedApplyFilters }: MetadataFiltersProps) {
  return (
    <>
      {/* Media Type */}
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Media Type</FormLabel>
            <Select 
              value={field.value || 'all'} 
              onValueChange={(value) => {
                field.onChange(value);
                debouncedApplyFilters(form.getValues());
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {field.value === 'all' && 'All types'}
                  {field.value === 'image' && 'Images'}
                  {field.value === 'video' && 'Videos'}
                  {field.value === 'data' && 'Data files'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="data">Data files</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
    </>
  );
}

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

type SortingFiltersProps = {
  form: UseFormReturn<MediaFilters>;
};

export function SortingFilters({ form }: SortingFiltersProps) {
  // Map sort values to human-readable labels
  const sortByLabels: Record<string, string> = {
    date: 'Date',
    name: 'Name',
    size: 'Size',
    type: 'Type',
  };

  const sortOrderLabels: Record<string, string> = {
    asc: 'Ascending',
    desc: 'Descending',
  };

  return (
    <>
      {/* Sort By */}
      <FormField
        control={form.control}
        name="sortBy"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sort By</FormLabel>
            <Select
              value={field.value || 'created_date'}
              onValueChange={field.onChange}
              aria-label="Sort by field"
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {sortByLabels[field.value || 'created_date']}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date">Date</SelectItem>
                <SelectItem value="file_name">Name</SelectItem>
                <SelectItem value="size_bytes">Size</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      {/* Sort Order */}
      <FormField
        control={form.control}
        name="sortOrder"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sort Order</FormLabel>
            <Select
              value={field.value || 'desc'}
              onValueChange={field.onChange}
              aria-label="Sort order"
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {sortOrderLabels[field.value || 'desc']}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
    </>
  );
}

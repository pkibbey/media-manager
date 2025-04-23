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
              value={field.value || 'date'}
              onValueChange={field.onChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {field.value === 'date' && 'Date'}
                  {field.value === 'name' && 'Name'}
                  {field.value === 'size' && 'Size'}
                  {field.value === 'type' && 'Type'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="size">Size</SelectItem>
                <SelectItem value="type">Type</SelectItem>
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
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {field.value === 'asc' && 'Ascending'}
                  {field.value === 'desc' && 'Descending'}
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

import { ArrowDownCircleIcon, ArrowUpCircleIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MediaFilters } from '@/types/media-types';

type BasicFiltersProps = {
  form: UseFormReturn<MediaFilters>;
  isAdvancedOpen: boolean;
  setIsAdvancedOpen: (isOpen: boolean) => void;
  debouncedApplyFilters: (values: MediaFilters) => void;
};

export function BasicFilters({
  form,
  isAdvancedOpen,
  setIsAdvancedOpen,
  debouncedApplyFilters,
}: BasicFiltersProps) {
  return (
    <div className="flex flex-col items-end sm:flex-row gap-4 flex-wrap">
      {/* Search */}
      <FormField
        control={form.control}
        name="search"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel>Search</FormLabel>
            <FormControl>
              <Input
                placeholder="Search media..."
                {...field}
                className="w-full min-w-32"
                onChange={(e) => {
                  field.onChange(e);
                  debouncedApplyFilters(form.getValues());
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* EXIF Processing Status */}
      <FormField
        control={form.control}
        name="processed"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Exif</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="ExifData status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All files</SelectItem>
                <SelectItem value="yes">Processed</SelectItem>
                <SelectItem value="no">Not processed</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      {/* Thumbnail Status */}
      <FormField
        control={form.control}
        name="hasThumbnail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Thumbnail</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Thumbnail status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any file</SelectItem>
                <SelectItem value="yes">Has thumbnail</SelectItem>
                <SelectItem value="no">No thumbnail</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      {/* Advanced Filters Toggle */}
      <div>
        <Button
          type="button"
          variant={isAdvancedOpen ? 'default' : 'secondary'}
          className="w-full"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
        >
          {isAdvancedOpen ? (
            <ArrowUpCircleIcon className="h-4 w-4" />
          ) : (
            <ArrowDownCircleIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

import { CalendarIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { MediaFilters } from '@/types/media-types';

type DateRangeFilterProps = {
  form: UseFormReturn<MediaFilters>;
  debouncedApplyFilters: (values: MediaFilters) => void;
};

export function DateRangeFilter({ form, debouncedApplyFilters }: DateRangeFilterProps) {
  // Helper to safely format date or return placeholder
  const formatDateOrPlaceholder = (date: Date | null) => {
    if (!date || isNaN(date.getTime())) {
      return <span>Pick a date</span>;
    }
    return format(date, 'PPP');
  };

  return (
    <>
      {/* Date Range - From */}
      <FormField
        control={form.control}
        name="dateFrom"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>From Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={`w-full pl-3 text-left font-normal ${
                      !field.value && 'text-muted-foreground'
                    }`}
                  >
                    {formatDateOrPlaceholder(field.value)}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value || undefined}
                  onSelect={(date) => {
                    field.onChange(date);
                    debouncedApplyFilters(form.getValues());
                  }}
                  disabled={(date) => {
                    const dateTo = form.getValues('dateTo');
                    return dateTo ? date > dateTo : false;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {field.value && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 text-xs h-auto py-1"
                onClick={() => {
                  field.onChange(null);
                  debouncedApplyFilters(form.getValues());
                }}
              >
                Clear
              </Button>
            )}
          </FormItem>
        )}
      />

      {/* Date Range - To */}
      <FormField
        control={form.control}
        name="dateTo"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>To Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={`w-full pl-3 text-left font-normal ${
                      !field.value && 'text-muted-foreground'
                    }`}
                  >
                    {formatDateOrPlaceholder(field.value)}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value || undefined}
                  onSelect={(date) => {
                    field.onChange(date);
                    debouncedApplyFilters(form.getValues());
                  }}
                  disabled={(date) =>
                    form.getValues('dateFrom')
                      ? date < form.getValues('dateFrom')!
                      : false
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {field.value && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 text-xs h-auto py-1"
                onClick={() => {
                  field.onChange(null);
                  debouncedApplyFilters(form.getValues());
                }}
              >
                Clear
              </Button>
            )}
          </FormItem>
        )}
      />
    </>
  );
}

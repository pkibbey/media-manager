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
  applyFilters: (values: MediaFilters) => void;
};

export function DateRangeFilter({ form, applyFilters }: DateRangeFilterProps) {
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
                    {field.value ? (
                      format(field.value, 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
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
                    applyFilters(form.getValues());
                  }}
                  disabled={(date) =>
                    form.getValues('dateTo')
                      ? date > form.getValues('dateTo')!
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
                  applyFilters(form.getValues());
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
                    {field.value ? (
                      format(field.value, 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
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
                    applyFilters(form.getValues());
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
                  applyFilters(form.getValues());
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

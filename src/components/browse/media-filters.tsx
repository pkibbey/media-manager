'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, FileIcon, ResetIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Slider } from '../ui/slider';

// Define the filter schema
const filterSchema = z.object({
  search: z.string().optional(),
  type: z.enum(['all', 'image', 'video', 'data']).default('all').optional(),
  dateFrom: z.date().optional().nullable(),
  dateTo: z.date().optional().nullable(),
  minSize: z.number().min(0).default(0).optional(),
  maxSize: z.number().min(0).default(100).optional(),
  sortBy: z.enum(['date', 'name', 'size', 'type']).default('date').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
  processed: z.enum(['all', 'yes', 'no']).default('all').optional(),
  organized: z.enum(['all', 'yes', 'no']).default('all').optional(),
});

export type MediaFilters = z.infer<typeof filterSchema>;

interface MediaFiltersProps {
  totalCount: number;
  availableExtensions: string[];
  maxFileSize: number; // in MB
  onFiltersChange: (filters: MediaFilters) => void;
}

export default function MediaFilters({
  totalCount,
  availableExtensions,
  maxFileSize,
  onFiltersChange,
}: MediaFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize the form with values from URL search params
  const form = useForm<MediaFilters>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      search: searchParams.get('search') || '',
      type: (searchParams.get('type') as MediaFilters['type']) || 'all',
      dateFrom: searchParams.get('dateFrom')
        ? new Date(searchParams.get('dateFrom') || '')
        : null,
      dateTo: searchParams.get('dateTo')
        ? new Date(searchParams.get('dateTo') || '')
        : null,
      minSize: Number(searchParams.get('minSize')) || 0,
      maxSize: Number(searchParams.get('maxSize')) || maxFileSize,
      sortBy: (searchParams.get('sortBy') as MediaFilters['sortBy']) || 'date',
      sortOrder:
        (searchParams.get('sortOrder') as MediaFilters['sortOrder']) || 'desc',
      processed:
        (searchParams.get('processed') as MediaFilters['processed']) || 'all',
      organized:
        (searchParams.get('organized') as MediaFilters['organized']) || 'all',
    },
  });

  // Apply filters when form values change
  const onSubmit = (values: MediaFilters) => {
    onFiltersChange(values);

    // Update URL with filter params
    const params = new URLSearchParams();
    if (values.search) params.set('search', values.search);
    if (values.type && values.type !== 'all') params.set('type', values.type);
    if (values.dateFrom) params.set('dateFrom', values.dateFrom.toISOString());
    if (values.dateTo) params.set('dateTo', values.dateTo.toISOString());
    if (values.minSize && values.minSize > 0)
      params.set('minSize', values.minSize.toString());
    if (values.maxSize && values.maxSize < maxFileSize)
      params.set('maxSize', values.maxSize.toString());
    if (values.sortBy && values.sortBy !== 'date')
      params.set('sortBy', values.sortBy);
    if (values.sortOrder && values.sortOrder !== 'desc')
      params.set('sortOrder', values.sortOrder);
    if (values.processed && values.processed !== 'all')
      params.set('processed', values.processed);
    if (values.organized && values.organized !== 'all')
      params.set('organized', values.organized);

    // Keep the page param if it exists
    const page = searchParams.get('page');
    if (page && page !== '1') params.set('page', page);

    router.push(`/browse?${params.toString()}`);
  };

  // Reset all filters
  const handleReset = () => {
    form.reset({
      search: '',
      type: 'all',
      dateFrom: null,
      dateTo: null,
      minSize: 0,
      maxSize: maxFileSize,
      sortBy: 'date',
      sortOrder: 'desc',
      processed: 'all',
      organized: 'all',
    });
    onFiltersChange(form.getValues());
    router.push('/browse');
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Search and basic filters row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <FormField
                control={form.control}
                name="search"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Search files by name..."
                          {...field}
                          className="pr-8"
                        />
                        <Button
                          type="submit"
                          size="icon"
                          variant="ghost"
                          className="absolute right-0 top-0 h-full px-2"
                        >
                          <FileIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="sortBy"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Sort" />
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

                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <ToggleGroup
                        type="single"
                        value={field.value}
                        onValueChange={(value) => {
                          if (value) field.onChange(value);
                        }}
                      >
                        <ToggleGroupItem
                          value="asc"
                          aria-label="Sort ascending"
                        >
                          ↑
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="desc"
                          aria-label="Sort descending"
                        >
                          ↓
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleReset}
                  title="Reset filters"
                >
                  <ResetIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Type filter row */}
            <div className="flex flex-wrap gap-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={(value) => {
                        if (value) {
                          field.onChange(value);
                          form.handleSubmit(onSubmit)();
                        }
                      }}
                    >
                      <ToggleGroupItem value="all" aria-label="All file types">
                        All
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="image"
                        aria-label="Image files only"
                      >
                        Images
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="video"
                        aria-label="Video files only"
                      >
                        Videos
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="data"
                        aria-label="Data files only"
                      >
                        Data
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateFrom"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="pl-3 pr-2 flex items-center gap-1"
                        >
                          <CalendarIcon className="h-4 w-4 opacity-50" />
                          {field.value ? (
                            format(field.value, 'PP')
                          ) : (
                            <span className="text-muted-foreground">From</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={(date) => {
                            field.onChange(date);
                            form.handleSubmit(onSubmit)();
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateTo"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="pl-3 pr-2 flex items-center gap-1"
                        >
                          <CalendarIcon className="h-4 w-4 opacity-50" />
                          {field.value ? (
                            format(field.value, 'PP')
                          ) : (
                            <span className="text-muted-foreground">To</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={(date) => {
                            field.onChange(date);
                            form.handleSubmit(onSubmit)();
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            </div>

            {/* Toggle advanced filters */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            >
              {isAdvancedOpen
                ? 'Hide advanced filters'
                : 'Show advanced filters'}
            </Button>

            {/* Advanced filters */}
            {isAdvancedOpen && (
              <div className="grid md:grid-cols-2 gap-4 p-4 border rounded-md">
                {/* File size range */}
                <FormField
                  control={form.control}
                  name="minSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min file size (MB): {field.value}</FormLabel>
                      <FormControl>
                        <Slider
                          value={[field.value || 0]}
                          min={0}
                          max={maxFileSize}
                          step={1}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                          }}
                          onValueCommit={() => form.handleSubmit(onSubmit)()}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max file size (MB): {field.value}</FormLabel>
                      <FormControl>
                        <Slider
                          value={[field.value || 0]}
                          min={0}
                          max={maxFileSize}
                          step={1}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                          }}
                          onValueCommit={() => form.handleSubmit(onSubmit)()}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Processing status */}
                <FormField
                  control={form.control}
                  name="processed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Processing status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.handleSubmit(onSubmit)();
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="yes">Processed</SelectItem>
                          <SelectItem value="no">Unprocessed</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Organization status */}
                <FormField
                  control={form.control}
                  name="organized"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.handleSubmit(onSubmit)();
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="yes">Organized</SelectItem>
                          <SelectItem value="no">Unorganized</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        </form>
      </Form>

      <div className="text-sm text-muted-foreground">
        Found {totalCount} {totalCount === 1 ? 'item' : 'items'} matching your
        criteria
      </div>
    </div>
  );
}

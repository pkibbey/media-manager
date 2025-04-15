'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  CalendarIcon,
  MixerHorizontalIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

export interface MediaFilters {
  search: string;
  type: 'all' | 'image' | 'video' | 'data';
  dateFrom: Date | null;
  dateTo: Date | null;
  minSize: number;
  maxSize: number;
  sortBy: 'date' | 'name' | 'size' | 'type';
  sortOrder: 'asc' | 'desc';
  processed: 'all' | 'yes' | 'no';
  organized: 'all' | 'yes' | 'no';
  camera: string;
  hasLocation: 'all' | 'yes' | 'no';
}

interface MediaFiltersProps {
  totalCount?: number;
  availableExtensions?: string[];
  availableCameras?: string[];
  maxFileSize?: number;
  onFiltersChange: (filters: MediaFilters) => void;
}

export default function MediaFilters({
  totalCount = 0,
  availableExtensions = [],
  availableCameras = [],
  maxFileSize = 100,
  onFiltersChange,
}: MediaFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Create form with default values
  const form = useForm<MediaFilters>({
    defaultValues: {
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
      camera: '',
      hasLocation: 'all',
    },
  });

  // Initialize form values from URL params
  useEffect(() => {
    const formValues: Partial<MediaFilters> = {};

    if (searchParams.has('search')) {
      formValues.search = searchParams.get('search') || '';
    }

    const type = searchParams.get('type');
    if (type && ['all', 'image', 'video', 'data'].includes(type)) {
      formValues.type = type as MediaFilters['type'];
    }

    if (searchParams.has('dateFrom')) {
      try {
        formValues.dateFrom = new Date(searchParams.get('dateFrom')!);
      } catch (e) {
        console.error('Invalid dateFrom:', e);
      }
    }

    if (searchParams.has('dateTo')) {
      try {
        formValues.dateTo = new Date(searchParams.get('dateTo')!);
      } catch (e) {
        console.error('Invalid dateTo:', e);
      }
    }

    if (searchParams.has('minSize')) {
      const minSize = Number.parseInt(searchParams.get('minSize')!, 10);
      if (!isNaN(minSize)) formValues.minSize = minSize;
    }

    if (searchParams.has('maxSize')) {
      const maxSize = Number.parseInt(searchParams.get('maxSize')!, 10);
      if (!isNaN(maxSize)) formValues.maxSize = maxSize;
    }

    const sortBy = searchParams.get('sortBy');
    if (sortBy && ['date', 'name', 'size', 'type'].includes(sortBy)) {
      formValues.sortBy = sortBy as MediaFilters['sortBy'];
    }

    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder && ['asc', 'desc'].includes(sortOrder)) {
      formValues.sortOrder = sortOrder as MediaFilters['sortOrder'];
    }

    const processed = searchParams.get('processed');
    if (processed && ['all', 'yes', 'no'].includes(processed)) {
      formValues.processed = processed as MediaFilters['processed'];
    }

    const organized = searchParams.get('organized');
    if (organized && ['all', 'yes', 'no'].includes(organized)) {
      formValues.organized = organized as MediaFilters['organized'];
    }

    const camera = searchParams.get('camera');
    if (camera) {
      formValues.camera = camera;
    }

    const hasLocation = searchParams.get('hasLocation');
    if (hasLocation && ['all', 'yes', 'no'].includes(hasLocation)) {
      formValues.hasLocation = hasLocation as MediaFilters['hasLocation'];
    }

    // Check if advanced filters are used (compare to defaults)
    const isAdvanced =
      (processed && processed !== 'all') ||
      (organized && organized !== 'all') ||
      (camera && camera !== '') ||
      (hasLocation && hasLocation !== 'all') ||
      !!formValues.dateFrom ||
      !!formValues.dateTo ||
      (typeof formValues.minSize === 'number' && formValues.minSize > 0) ||
      (typeof formValues.maxSize === 'number' &&
        formValues.maxSize < maxFileSize);
    setIsAdvancedOpen(isAdvanced);

    // Reset form with values from URL
    form.reset({
      ...form.getValues(),
      ...formValues,
      // Ensure min/max size default properly
      minSize: formValues.minSize !== undefined ? formValues.minSize : 0,
      maxSize:
        formValues.maxSize !== undefined ? formValues.maxSize : maxFileSize,
    });
  }, [searchParams, form, maxFileSize]);

  // Apply filters and update URL
  const handleSubmit = useCallback(
    async (values: MediaFilters) => {
      setIsLoading(true);

      try {
        // Update URL with filter params
        const params = new URLSearchParams();

        // Only add non-empty filters
        if (values.search) params.set('search', values.search);
        if (values.type !== 'all') params.set('type', values.type);
        if (values.dateFrom)
          params.set('dateFrom', values.dateFrom.toISOString());
        if (values.dateTo) params.set('dateTo', values.dateTo.toISOString());
        if (values.minSize > 0) params.set('minSize', String(values.minSize));
        if (values.maxSize < maxFileSize)
          params.set('maxSize', String(values.maxSize));
        if (values.sortBy !== 'date') params.set('sortBy', values.sortBy);
        if (values.sortOrder !== 'desc')
          params.set('sortOrder', values.sortOrder);
        if (values.processed !== 'all')
          params.set('processed', values.processed);
        if (values.organized !== 'all')
          params.set('organized', values.organized);
        if (values.camera) params.set('camera', values.camera);
        if (values.hasLocation !== 'all')
          params.set('hasLocation', values.hasLocation);

        // Update URL
        router.push(`/browse?${params.toString()}`);

        // Notify parent component
        onFiltersChange(values);
      } finally {
        setIsLoading(false);
      }
    },
    [router, onFiltersChange, maxFileSize],
  );

  // Reset filters
  const handleReset = useCallback(() => {
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
      camera: '',
      hasLocation: 'all',
    });
    router.push('/browse');
    onFiltersChange(form.getValues());
  }, [form, router, onFiltersChange, maxFileSize]);

  return (
    <div className="bg-card border rounded-lg shadow-sm p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <FormField
              control={form.control}
              name="search"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="Search media..."
                      {...field}
                      className="w-full"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Media Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Media type" />
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

            {/* Sort By */}
            <FormField
              control={form.control}
              name="sortBy"
              render={({ field }) => (
                <FormItem>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.handleSubmit(handleSubmit)();
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Sort by" />
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
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.handleSubmit(handleSubmit)();
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Sort order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading && (
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Apply
            </Button>
          </div>

          {/* Advanced Filters Toggle */}
          <div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            >
              <MixerHorizontalIcon className="mr-2 h-4 w-4" />
              {isAdvancedOpen ? 'Hide' : 'Show'} Advanced Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {isAdvancedOpen && (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 border-t pt-4">
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
                        onClick={() => field.onChange(null)}
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
                        onClick={() => field.onChange(null)}
                      >
                        Clear
                      </Button>
                    )}
                  </FormItem>
                )}
              />

              {/* EXIF Processing Status */}
              <FormField
                control={form.control}
                name="processed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metadata Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Metadata status" />
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

              {/* Organized Status */}
              <FormField
                control={form.control}
                name="organized"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Organization status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All files</SelectItem>
                        <SelectItem value="yes">Organized</SelectItem>
                        <SelectItem value="no">Not organized</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Camera Selection */}
              <FormField
                control={form.control}
                name="camera"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Camera</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any Camera" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Camera</SelectItem>
                        {availableCameras.map((camera) => (
                          <SelectItem key={camera} value={camera}>
                            {camera}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Location Data */}
              <FormField
                control={form.control}
                name="hasLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Data</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Location data" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any file</SelectItem>
                        <SelectItem value="yes">Has location</SelectItem>
                        <SelectItem value="no">No location</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* File Size Range */}
              <FormField
                control={form.control}
                name="minSize"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <div className="flex justify-between">
                      <FormLabel>File Size Range</FormLabel>
                      <span className="text-xs text-muted-foreground">
                        {form.getValues('minSize')}MB -{' '}
                        {form.getValues('maxSize')}MB
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={maxFileSize}
                      step={1}
                      value={[
                        form.getValues('minSize'),
                        form.getValues('maxSize'),
                      ]}
                      onValueChange={(values) => {
                        form.setValue('minSize', values[0]);
                        form.setValue('maxSize', values[1]);
                      }}
                      className="py-4"
                    />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Summary and Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              {totalCount > 0 ? (
                <>Showing {totalCount} items</>
              ) : (
                <>No items match your criteria</>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              Reset Filters
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

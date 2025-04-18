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
import type { MediaFilters } from '@/types/media-types';
import {
  CalendarIcon,
  MixerHorizontalIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { debounce } from 'lodash';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

interface MediaFiltersProps {
  totalCount?: number;
  availableCameras?: string[];
  maxFileSize?: number;
  onFiltersChange: (filters: MediaFilters) => void;
}

export default function MediaFilterView({
  totalCount = 0,
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
      hasThumbnail: 'all',
    },
  });

  // Create a debounced version of the filter apply function
  // We'll use this for text search to avoid too many requests while typing
  const debouncedApplyFilters = useRef(
    debounce((values: MediaFilters) => {
      applyFilters(values);
    }, 300),
  ).current;

  // Initialize form values from URL params
  useEffect(() => {
    const formValues: Partial<MediaFilters> = {};

    if (searchParams.has('search')) {
      formValues.search = searchParams.get('search') || '';
    }

    // Fix for data files type selection issue
    const type = searchParams.get('type');
    if (type && ['all', 'image', 'video', 'data'].includes(type)) {
      formValues.type = type as MediaFilters['type'];
    } else {
      formValues.type = 'all'; // Default to 'all' if not specified or invalid
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

    const hasThumbnail = searchParams.get('hasThumbnail');
    if (hasThumbnail && ['all', 'yes', 'no'].includes(hasThumbnail)) {
      formValues.hasThumbnail = hasThumbnail as MediaFilters['hasThumbnail'];
    }

    setIsAdvancedOpen(false);

    // Reset form with values from URL, ensuring we always have valid values
    form.reset({
      search: formValues.search || '',
      type: formValues.type || 'all',
      dateFrom: formValues.dateFrom || null,
      dateTo: formValues.dateTo || null,
      minSize: formValues.minSize !== undefined ? formValues.minSize : 0,
      maxSize:
        formValues.maxSize !== undefined ? formValues.maxSize : maxFileSize,
      sortBy: formValues.sortBy || 'date',
      sortOrder: formValues.sortOrder || 'desc',
      processed: formValues.processed || 'all',
      organized: formValues.organized || 'all',
      camera: formValues.camera || '',
      hasLocation: formValues.hasLocation || 'all',
      hasThumbnail: formValues.hasThumbnail || 'all',
    });

    // Ensure form values get applied after reset
    const currentFormValues = form.getValues();
    if (formValues.type && formValues.type !== currentFormValues.type) {
      form.setValue('type', formValues.type);
    }
  }, [searchParams, form, maxFileSize]);

  // Apply filters and update URL
  const applyFilters = useCallback(
    (values: MediaFilters) => {
      setIsLoading(true);

      try {
        // Ensure we have valid values before applying filters
        const validatedValues = {
          ...values,
          type: values.type || 'all',
          sortBy: values.sortBy || 'date',
          sortOrder: values.sortOrder || 'desc',
          maxSize: values.maxSize !== undefined ? values.maxSize : maxFileSize,
        };

        // Update URL with filter params
        const params = new URLSearchParams();

        // Only add non-empty filters
        if (validatedValues.search)
          params.set('search', validatedValues.search);
        if (validatedValues.type !== 'all')
          params.set('type', validatedValues.type);
        if (validatedValues.dateFrom)
          params.set('dateFrom', validatedValues.dateFrom.toISOString());
        if (validatedValues.dateTo)
          params.set('dateTo', validatedValues.dateTo.toISOString());
        if (validatedValues.minSize > 0)
          params.set('minSize', String(validatedValues.minSize));
        if (validatedValues.maxSize < maxFileSize)
          params.set('maxSize', String(validatedValues.maxSize));
        if (validatedValues.sortBy !== 'date')
          params.set('sortBy', validatedValues.sortBy);
        if (validatedValues.sortOrder !== 'desc')
          params.set('sortOrder', validatedValues.sortOrder);
        if (validatedValues.processed !== 'all')
          params.set('processed', validatedValues.processed);
        if (validatedValues.organized !== 'all')
          params.set('organized', validatedValues.organized);
        if (validatedValues.camera && validatedValues.camera !== 'all')
          params.set('camera', validatedValues.camera);
        if (validatedValues.hasLocation !== 'all')
          params.set('hasLocation', validatedValues.hasLocation);
        if (validatedValues.hasThumbnail !== 'all')
          params.set('hasThumbnail', validatedValues.hasThumbnail);

        // Update URL
        router.push(`/browse?${params.toString()}`);

        // Notify parent component
        onFiltersChange(validatedValues);
      } finally {
        setIsLoading(false);
      }
    },
    [router, onFiltersChange, maxFileSize],
  );

  // Watch for changes to select fields and apply filters automatically
  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      // Don't auto-submit for search text input (we're using debounce for that)
      if (
        name &&
        [
          'type',
          'sortBy',
          'sortOrder',
          'processed',
          'organized',
          'camera',
          'hasLocation',
          'hasThumbnail',
        ].includes(name)
      ) {
        // Ensure we always reset to page 1 when filters change
        const params = new URLSearchParams();

        // Copy existing search parameters that we want to preserve
        if (values.search) params.set('search', values.search);
        if (values.type !== 'all') params.set('type', values.type || 'all');
        if (values.dateFrom)
          params.set('dateFrom', values.dateFrom.toISOString());
        if (values.dateTo) params.set('dateTo', values.dateTo.toISOString());
        if ((values.minSize ?? 0) > 0)
          params.set('minSize', String(values.minSize));
        if (values.maxSize !== undefined && values.maxSize < maxFileSize)
          params.set('maxSize', String(values.maxSize));
        if (values.sortBy !== 'date' && values.sortBy)
          params.set('sortBy', values.sortBy);
        if (values.sortOrder !== 'desc' && values.sortOrder)
          params.set('sortOrder', values.sortOrder);
        if (values.processed !== 'all' && values.processed)
          params.set('processed', values.processed);
        if (values.organized !== 'all' && values.organized)
          params.set('organized', values.organized);
        if (values.camera && values.camera !== 'all')
          params.set('camera', values.camera);
        if (values.hasLocation !== 'all' && values.hasLocation)
          params.set('hasLocation', values.hasLocation);
        if (values.hasThumbnail !== 'all' && values.hasThumbnail)
          params.set('hasThumbnail', values.hasThumbnail);

        // Always reset to page 1 when filter changes
        params.set('page', '1');

        // Update URL first
        router.push(`/browse?${params.toString()}`);

        // Then apply filters
        applyFilters(values as MediaFilters);
      }
    });

    // Clean up subscription
    return () => subscription.unsubscribe();
  }, [form, router, maxFileSize, applyFilters]);
  // Reset filters
  const handleReset = useCallback(() => {
    const defaultValues: MediaFilters = {
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
      hasThumbnail: 'all',
    };

    form.reset(defaultValues);
    router.push('/browse');
    onFiltersChange(defaultValues);
  }, [form, router, onFiltersChange, maxFileSize]);

  return (
    <div className="bg-card rounded-lg px-6 py-5">
      <h3 className="text-lg font-semibold mb-4">Media Filters</h3>
      <Form {...form}>
        <form
          // Keep the onSubmit handler for pressing Enter in text fields
          onSubmit={form.handleSubmit((values) => applyFilters(values))}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
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
                      className="w-full min-w-32"
                      onChange={(e) => {
                        field.onChange(e);
                        // Use debounced version for search text
                        debouncedApplyFilters(form.getValues());
                      }}
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
                  <Select
                    value={field.value || 'all'} // Ensure there's always a default value
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-[150px]">
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

            {/* Sort By */}
            <FormField
              control={form.control}
              name="sortBy"
              render={({ field }) => (
                <FormItem>
                  <Select
                    value={field.value || 'date'} // Ensure there's always a default value
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-[150px]">
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
                  <Select
                    value={field.value || 'desc'} // Ensure there's always a default value
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-[150px]">
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

            <Button type="submit" disabled={isLoading}>
              {isLoading && (
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Apply
            </Button>

            {/* Advanced Filters Toggle */}
            <div>
              <Button
                type="button"
                variant={isAdvancedOpen ? 'outline' : 'secondary'}
                className="w-full"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              >
                <MixerHorizontalIcon className="mr-2 h-4 w-4" />
                {isAdvancedOpen ? 'Hide' : 'Show'} Advanced Filters
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {isAdvancedOpen && (
            <div className="grid grid-cols-2 gap-4 auto-rows-max content-start">
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
                            // Apply filter when date is selected
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
                          // Apply filter when date is cleared
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
                            // Apply filter when date is selected
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
                          // Apply filter when date is cleared
                          applyFilters(form.getValues());
                        }}
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
                    <FormLabel>ExifData Status</FormLabel>
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
                    <Select
                      value={field.value || 'all'}
                      onValueChange={field.onChange}
                    >
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

              {/* Thumbnail Status */}
              <FormField
                control={form.control}
                name="hasThumbnail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail Status</FormLabel>
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

              {/* File Size Range */}
              <FormField
                control={form.control}
                name="minSize"
                render={() => (
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
                      onValueCommit={(values) => {
                        form.setValue('minSize', values[0]);
                        form.setValue('maxSize', values[1]);
                        // Only apply filter when slider stops moving
                        applyFilters(form.getValues());
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

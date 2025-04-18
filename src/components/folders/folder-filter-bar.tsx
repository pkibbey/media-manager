'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MixerHorizontalIcon, ReloadIcon } from '@radix-ui/react-icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

export interface FolderFilters {
  search: string;
  type: 'all' | 'image' | 'video' | 'data';
  sortBy: 'date' | 'name' | 'size' | 'type';
  sortOrder: 'asc' | 'desc';
  hasThumbnail: 'all' | 'yes' | 'no';
}

interface FolderFilterBarProps {
  totalCount?: number;
  onFiltersChange: (filters: FolderFilters) => void;
}

export default function FolderFilterBar({
  totalCount = 0,
  onFiltersChange,
}: FolderFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Create form with default values
  const form = useForm<FolderFilters>({
    defaultValues: {
      search: '',
      type: 'all',
      sortBy: 'date',
      sortOrder: 'desc',
      hasThumbnail: 'all',
    },
  });

  // Initialize form values from URL params
  useEffect(() => {
    const formValues: Partial<FolderFilters> = {};

    if (searchParams.has('search')) {
      formValues.search = searchParams.get('search') || '';
    }

    const type = searchParams.get('type');
    if (type && ['all', 'image', 'video', 'data'].includes(type)) {
      formValues.type = type as FolderFilters['type'];
    }

    const sortBy = searchParams.get('sortBy');
    if (sortBy && ['date', 'name', 'size', 'type'].includes(sortBy)) {
      formValues.sortBy = sortBy as FolderFilters['sortBy'];
    }

    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder && ['asc', 'desc'].includes(sortOrder)) {
      formValues.sortOrder = sortOrder as FolderFilters['sortOrder'];
    }

    const hasThumbnail = searchParams.get('hasThumbnail');
    if (hasThumbnail && ['all', 'yes', 'no'].includes(hasThumbnail)) {
      formValues.hasThumbnail = hasThumbnail as FolderFilters['hasThumbnail'];
    }

    // Reset form with values from URL
    form.reset({
      ...form.getValues(),
      ...formValues,
    });
  }, [searchParams, form]);

  // Apply filters and update URL
  const handleSubmit = useCallback(
    async (values: FolderFilters) => {
      setIsLoading(true);

      try {
        // Get existing folder parameters that we want to preserve
        const params = new URLSearchParams(searchParams);

        // Only add non-empty filters
        if (values.search) {
          params.set('search', values.search);
        } else {
          params.delete('search');
        }

        if (values.type !== 'all') {
          params.set('type', values.type);
        } else {
          params.delete('type');
        }

        if (values.sortBy !== 'date') {
          params.set('sortBy', values.sortBy);
        } else {
          params.delete('sortBy');
        }

        if (values.sortOrder !== 'desc') {
          params.set('sortOrder', values.sortOrder);
        } else {
          params.delete('sortOrder');
        }

        if (values.hasThumbnail !== 'all') {
          params.set('hasThumbnail', values.hasThumbnail);
        } else {
          params.delete('hasThumbnail');
        }

        // Reset to first page when changing filters
        params.set('page', '1');

        // Update URL
        router.push(`${pathname}?${params.toString()}`);

        // Notify parent component
        onFiltersChange(values);
      } finally {
        setIsLoading(false);
      }
    },
    [router, searchParams, pathname, onFiltersChange],
  );

  // Reset filters
  const handleReset = useCallback(() => {
    // Get existing folder parameters that we want to preserve
    const folder = searchParams.get('folder') || '/';
    const subfolders = searchParams.get('subfolders');

    const params = new URLSearchParams();
    params.set('folder', folder);
    params.set('page', '1');
    if (subfolders) {
      params.set('subfolders', subfolders);
    }

    router.push(`${pathname}?${params.toString()}`);

    form.reset({
      search: '',
      type: 'all',
      sortBy: 'date',
      sortOrder: 'desc',
      hasThumbnail: 'all',
    });

    onFiltersChange(form.getValues());
  }, [form, router, pathname, searchParams, onFiltersChange]);

  return (
    <div className="bg-card rounded-lg px-4 py-3 mb-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            {/* Search */}
            <FormField
              control={form.control}
              name="search"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="Search in this folder..."
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
                    <SelectTrigger className="w-[130px]">
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
                    <SelectTrigger className="w-[130px]">
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
                    <SelectTrigger className="w-[130px]">
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

            {/* Thumbnail Filter */}
            <FormField
              control={form.control}
              name="hasThumbnail"
              render={({ field }) => (
                <FormItem>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Thumbnails" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All files</SelectItem>
                      <SelectItem value="yes">Has thumbnail</SelectItem>
                      <SelectItem value="no">No thumbnail</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <Button type="submit" className="shrink-0" disabled={isLoading}>
              {isLoading && (
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Apply
            </Button>

            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={handleReset}
            >
              <MixerHorizontalIcon className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>

          {/* Summary */}
          <div className="text-sm text-muted-foreground pt-1">
            {totalCount > 0 ? (
              <>Showing {totalCount} items</>
            ) : (
              <>No items match your criteria</>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

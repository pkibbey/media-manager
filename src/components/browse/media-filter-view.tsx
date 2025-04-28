'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import type { MediaFilters } from '@/types/media-types';
import { AdvancedFilters } from './media-filter/AdvancedFilters';
import { BasicFilters } from './media-filter/BasicFilters';
import { useMediaFilters } from './media-filter/useMediaFilters';

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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

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
      camera: 'all', // Changed from '' to 'all' for consistency
      hasLocation: 'all',
      hasThumbnail: 'all',
    },
  });

  const { applyFilters, handleReset, debouncedApplyFilters } = useMediaFilters({
    form,
    maxFileSize,
    onFiltersChange,
  });

  return (
    <Form {...form}>
      <form
        id="media-filter-view"
        onSubmit={(e) => e.preventDefault()}
        className="space-y-4"
      >
        <BasicFilters
          form={form}
          isAdvancedOpen={isAdvancedOpen}
          setIsAdvancedOpen={setIsAdvancedOpen}
          debouncedApplyFilters={debouncedApplyFilters}
        />

        <AdvancedFilters
          form={form}
          applyFilters={applyFilters}
          totalCount={totalCount}
          maxFileSize={maxFileSize}
          availableCameras={availableCameras}
          handleReset={handleReset}
          isAdvancedOpen={isAdvancedOpen}
        />
      </form>
    </Form>
  );
}

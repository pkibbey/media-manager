'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { MAX_FILE_SIZE_IN_MB } from '@/lib/consts';
import type { MediaFilters } from '@/types/media-types';
import { AdvancedFilters } from './media-filter/AdvancedFilters';
import { BasicFilters } from './media-filter/BasicFilters';
import { useMediaFilters } from './media-filter/useMediaFilters';

interface MediaFiltersProps {
  totalCount?: number;
  onFiltersChange: (filters: MediaFilters) => void;
}

export default function MediaFilterView({
  totalCount = 0,
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
      maxSize: MAX_FILE_SIZE_IN_MB,
      sortBy: 'created_date',
      sortOrder: 'desc',
      hasExif: 'all',
      camera: 'all',
      hasLocation: 'all',
      hasThumbnail: 'all',
    },
  });

  const { applyFilters, handleReset, debouncedApplyFilters } = useMediaFilters({
    form,
    maxFileSize: MAX_FILE_SIZE_IN_MB,
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
          handleReset={handleReset}
          isAdvancedOpen={isAdvancedOpen}
        />
      </form>
    </Form>
  );
}

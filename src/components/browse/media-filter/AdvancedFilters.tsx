import type { UseFormReturn } from 'react-hook-form';
import type { MediaFilters } from '@/types/media-types';
import { DateRangeFilter } from './DateRangeFilter';
import { FileSizeFilter } from './FileSizeFilter';
import { FilterSummary } from './FilterSummary';
import { MetadataFilters } from './MetadataFilters';
import { SortingFilters } from './SortingFilters';

type AdvancedFiltersProps = {
  form: UseFormReturn<MediaFilters>;
  applyFilters: (values: MediaFilters) => void;
  debouncedApplyFilters: (values: MediaFilters) => void;
  totalCount: number;
  handleReset: () => void;
  isAdvancedOpen: boolean;
};

export function AdvancedFilters({
  form,
  applyFilters,
  debouncedApplyFilters,
  totalCount,
  handleReset,
  isAdvancedOpen,
}: AdvancedFiltersProps) {
  if (!isAdvancedOpen) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 auto-rows-max content-start pt-4 border-t mt-4">
      {/* Media Type, Camera and Location filters */}
      <MetadataFilters form={form} debouncedApplyFilters={debouncedApplyFilters} />

      {/* Sort By and Sort Order filters */}
      <SortingFilters form={form} debouncedApplyFilters={debouncedApplyFilters} />

      {/* Date Range Filters */}
      <DateRangeFilter form={form} debouncedApplyFilters={debouncedApplyFilters} />

      {/* File Size Range */}
      <FileSizeFilter form={form} debouncedApplyFilters={debouncedApplyFilters} />

      {/* Summary and Actions */}
      <div className="col-span-full">
        <FilterSummary totalCount={totalCount} onReset={handleReset} />
      </div>
    </div>
  );
}

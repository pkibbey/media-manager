import { useState } from 'react';
import { AdvancedFilters } from './AdvancedFilters';
import { BasicFilters } from './BasicFilters';
import { useMediaFilters } from './useMediaFilters';
import type { MediaFilters as MediaFiltersType } from '@/types/media-types';
import { MAX_FILE_SIZE_IN_MB } from '@/lib/consts';
import type { UseFormReturn } from 'react-hook-form';

type MediaFiltersProps = {
  form: UseFormReturn<MediaFiltersType>;
  totalCount: number;
  onFiltersChange: (filters: MediaFiltersType) => void;
};

export function MediaFilters({
  form,
  totalCount,
  onFiltersChange,
}: MediaFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const { applyFilters, handleReset, debouncedApplyFilters } = useMediaFilters({
    form,
    maxFileSize: MAX_FILE_SIZE_IN_MB,
    onFiltersChange,
  });

  return (
    <div className="w-full">
      <BasicFilters
        form={form}
        isAdvancedOpen={isAdvancedOpen}
        setIsAdvancedOpen={setIsAdvancedOpen}
        debouncedApplyFilters={debouncedApplyFilters}
      />
      <AdvancedFilters
        form={form}
        applyFilters={applyFilters}
        debouncedApplyFilters={debouncedApplyFilters}
        totalCount={totalCount}
        handleReset={handleReset}
        isAdvancedOpen={isAdvancedOpen}
      />
    </div>
  );
}
import { debounce } from 'lodash';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { MediaFilters } from '@/types/media-types';

export function useMediaFilters({
  form,
  maxFileSize,
  onFiltersChange,
}: {
  form: UseFormReturn<MediaFilters>;
  maxFileSize: number;
  onFiltersChange: (filters: MediaFilters) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const debouncedApplyFilters = useRef(
    debounce((values: MediaFilters) => {
      applyFilters(values);
    }, 300),
  ).current;

  // Apply filters to URL and call the change handler
  const applyFilters = useCallback(
    (values: MediaFilters) => {
      try {
        const validatedValues = {
          ...values,
          type: values.type || 'all',
          sortBy: values.sortBy || 'date',
          sortOrder: values.sortOrder || 'desc',
          maxSize: values.maxSize !== undefined ? values.maxSize : maxFileSize,
        };

        const params = new URLSearchParams();

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
        if (validatedValues.camera && validatedValues.camera !== 'all')
          params.set('camera', validatedValues.camera);
        if (validatedValues.hasLocation !== 'all')
          params.set('hasLocation', validatedValues.hasLocation);
        if (validatedValues.hasThumbnail !== 'all')
          params.set('hasThumbnail', validatedValues.hasThumbnail);

        router.push(`/browse?${params.toString()}`);

        onFiltersChange(validatedValues);
      } catch (error) {
        console.error('Error applying filters:', error);
      }
    },
    [router, onFiltersChange, maxFileSize],
  );

  // Initialize form from URL parameters
  useEffect(() => {
    const formValues: Partial<MediaFilters> = {};

    if (searchParams.has('search')) {
      formValues.search = searchParams.get('search') || '';
    }

    const type = searchParams.get('type');
    if (type && ['all', 'image', 'video', 'data'].includes(type)) {
      formValues.type = type as MediaFilters['type'];
    } else {
      formValues.type = 'all';
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
      camera: formValues.camera || '',
      hasLocation: formValues.hasLocation || 'all',
      hasThumbnail: formValues.hasThumbnail || 'all',
    });

    const currentFormValues = form.getValues();
    if (formValues.type && formValues.type !== currentFormValues.type) {
      form.setValue('type', formValues.type);
    }
  }, [searchParams, form, maxFileSize]);

  // Watch for form changes and apply filters
  useEffect(() => {
    const subscription = form.watch((values) => {
      const completeValues = values as MediaFilters;

      const timeoutId = setTimeout(() => {
        applyFilters(completeValues);
      }, 300);

      return () => clearTimeout(timeoutId);
    });

    return () => subscription.unsubscribe();
  }, [form, applyFilters]);

  // Reset all filters to defaults
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
      camera: '',
      hasLocation: 'all',
      hasThumbnail: 'all',
    };

    form.reset(defaultValues);
    router.push('/browse');
    onFiltersChange(defaultValues);
  }, [form, router, onFiltersChange, maxFileSize]);

  return {
    applyFilters,
    handleReset,
    debouncedApplyFilters,
  };
}

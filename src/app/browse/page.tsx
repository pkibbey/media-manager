'use client';

import { browseMedia } from '@/app/actions/browse';
import MediaFilterView from '@/components/browse/media-filter-view';
import MediaList from '@/components/media/media-list';
import { Pagination } from '@/components/ui/pagination';
import { PAGE_SIZE } from '@/lib/consts';
import type { MediaItem } from '@/types/db-types';
import type { MediaFilters } from '@/types/media-types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// Define the default filter values
const defaultFilters: MediaFilters = {
  search: '',
  type: 'all',
  dateFrom: null,
  dateTo: null,
  minSize: 0,
  maxSize: 100,
  sortBy: 'date',
  sortOrder: 'desc',
  processed: 'all',
  camera: '',
  hasLocation: 'all',
  hasThumbnail: 'all',
};

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filters, setFilters] = useState<MediaFilters>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    pageCount: 1,
    total: 0,
  });
  const [maxFileSize, setMaxFileSize] = useState(100);
  const [availableCameras, setAvailableCameras] = useState<string[]>([]);

  // Parse page from URL on initial load
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const parsedPage = Number.parseInt(pageParam, 10);
      if (!Number.isNaN(parsedPage) && parsedPage > 0) {
        setCurrentPage(parsedPage);
      }
    }

    // Parse filters from URL
    const parsedFilters: Partial<MediaFilters> = {};

    if (searchParams.has('search'))
      parsedFilters.search = searchParams.get('search') || '';

    const type = searchParams.get('type');
    if (type && ['all', 'image', 'video', 'data'].includes(type)) {
      parsedFilters.type = type as MediaFilters['type'];
    }

    if (searchParams.has('dateFrom')) {
      try {
        parsedFilters.dateFrom = new Date(searchParams.get('dateFrom')!);
      } catch (e) {
        console.error('Invalid dateFrom:', e);
      }
    }

    if (searchParams.has('dateTo')) {
      try {
        parsedFilters.dateTo = new Date(searchParams.get('dateTo')!);
      } catch (e) {
        console.error('Invalid dateTo:', e);
      }
    }

    if (searchParams.has('minSize')) {
      const minSize = Number.parseInt(searchParams.get('minSize')!, 10);
      if (!isNaN(minSize)) parsedFilters.minSize = minSize;
    }

    if (searchParams.has('maxSize')) {
      const maxSize = Number.parseInt(searchParams.get('maxSize')!, 10);
      if (!isNaN(maxSize)) parsedFilters.maxSize = maxSize;
    }

    const sortBy = searchParams.get('sortBy');
    if (sortBy && ['date', 'name', 'size', 'type'].includes(sortBy)) {
      parsedFilters.sortBy = sortBy as MediaFilters['sortBy'];
    }

    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder && ['asc', 'desc'].includes(sortOrder)) {
      parsedFilters.sortOrder = sortOrder as MediaFilters['sortOrder'];
    }

    const processed = searchParams.get('processed');
    if (processed && ['all', 'yes', 'no'].includes(processed)) {
      parsedFilters.processed = processed as MediaFilters['processed'];
    }

    const camera = searchParams.get('camera');
    if (camera) {
      parsedFilters.camera = camera;
    }

    const hasLocation = searchParams.get('hasLocation');
    if (hasLocation && ['all', 'yes', 'no'].includes(hasLocation)) {
      parsedFilters.hasLocation = hasLocation as MediaFilters['hasLocation'];
    }

    const hasThumbnail = searchParams.get('hasThumbnail');
    if (hasThumbnail && ['all', 'yes', 'no'].includes(hasThumbnail)) {
      parsedFilters.hasThumbnail = hasThumbnail as MediaFilters['hasThumbnail'];
    }

    // Update filters with parsed values
    setFilters((filters) => ({
      ...filters,
      ...defaultFilters,
      ...parsedFilters,
    }));
  }, [searchParams]);

  // Load media items with current filters and pagination
  useEffect(() => {
    const loadMedia = async () => {
      // Only show loading indicator on initial load,
      // for subsequent loads we'll keep showing the existing content
      if (initialLoad) {
        setLoading(true);
      }

      setError(null);

      try {
        const result = await browseMedia(filters, currentPage, PAGE_SIZE);

        if (result.success && result.data) {
          setMediaItems(result.data as MediaItem[]);
          setPagination(result.pagination);
          setMaxFileSize(result.maxFileSize);

          // Extract unique camera models from media items with processed EXIF data
          if (result.data.length > 0) {
            const uniqueCameras = new Set<string>();
            result.data.forEach((item) => {
              // @ts-ignore
              if (item.exif_data?.Image?.Model) {
                // @ts-ignore
                uniqueCameras.add(item.exif_data.Image.Model);
              }
            });

            const cameras = Array.from(uniqueCameras);
            setAvailableCameras(cameras);
          }
        } else {
          setError(result.error || 'Failed to load media items');
          // Only clear media items if there's an error
          setMediaItems([]);
        }
      } catch (error: any) {
        setError(error.message || 'An unexpected error occurred');
        // Only clear media items if there's an error
        setMediaItems([]);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    loadMedia();
  }, [filters, currentPage, initialLoad]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: MediaFilters) => {
    setFilters((filters: MediaFilters) => ({ ...filters, ...newFilters }));
    if (currentPage !== 1) {
      setCurrentPage(1); // Reset to first page when filters change
    }
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);

    // Update URL with new page
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/browse?${params.toString()}`);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Browse Media</h1>

      <div className="grid gap-4 min-h-[200px]">
        {!loading && error && (
          <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-md text-destructive">
            {error}
          </div>
        )}
        {initialLoad && loading && (
          <div className="flex items-center justify-center h-60">
            <div className="animate-pulse text-muted-foreground">
              Loading media...
            </div>
          </div>
        )}

        <MediaFilterView
          totalCount={pagination.total}
          maxFileSize={maxFileSize}
          availableCameras={availableCameras}
          onFiltersChange={handleFiltersChange}
        />

        {!loading && (
          <div className="relative">
            <MediaList items={mediaItems} />
            {pagination.pageCount > 1 && (
              <div className="mt-6">
                <Pagination
                  page={pagination.page}
                  pageCount={pagination.pageCount}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

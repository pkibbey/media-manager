'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import MediaFilterView from '@/components/browse/media-filter-view';
import MediaList from '@/components/media/media-list';
import { Pagination, type PaginationObject } from '@/components/ui/pagination';

import { PAGE_SIZE } from '@/lib/consts';
import type { MediaItem } from '@/types/db-types';
import type { MediaFilters } from '@/types/media-types';
import { getMediaItems } from '../actions/browse/get-media-items';

// Define the default filter values
const defaultFilters: MediaFilters = {
  search: '',
  type: 'all',
  dateFrom: null,
  dateTo: null,
  minSize: 0,
  maxSize: 1024 * 1024 * 4,
  sortBy: 'created_date',
  sortOrder: 'desc',
  hasExif: 'all',
  hasLocation: 'all',
  hasThumbnail: 'all',
  hasAnalysis: 'all',
  includeDeleted: false,
  includeHidden: false,
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
  const [pagination, setPagination] = useState<PaginationObject>({
    page: 1,
    pageSize: PAGE_SIZE,
    pageCount: 1,
    total: 0,
  });

  // Load media items with current filters and pagination
  useEffect(() => {
    const loadMedia = async () => {
      // Only show loading indicator on initial load,
      // for subsequent loads we'll keep showing the existing content
      if (initialLoad) {
        setLoading(true);
      }

      setError(null);

      const { data, error, count } = await getMediaItems({
        filters,
        page: currentPage,
        pageSize: PAGE_SIZE,
      });

      if (error) {
        setError(error.message || 'An unknown error occurred');
        // Only clear media items if there's an error
        setMediaItems([]);
      }

      if (!error && data) {
        setMediaItems(data);
        setPagination((prev) => ({
          ...prev,
          page: currentPage,
          pageCount: Math.ceil((count || 0) / PAGE_SIZE),
          total: count || 0,
        }));
      }

      setLoading(false);
      setInitialLoad(false);
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
    <div className="container mx-auto py-6">
      <div className="grid gap-8 min-h-60 items-start">
        {!loading && error && (
          <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-md text-destructive">
            {error}
          </div>
        )}

        <MediaFilterView
          totalCount={pagination.total}
          onFiltersChange={handleFiltersChange}
        />

        {initialLoad && loading && (
          <div className="flex items-center justify-center h-60">
            <div className="animate-pulse text-muted-foreground">
              Loading media...
            </div>
          </div>
        )}

        {!loading && (
          <div className="relative">
            <MediaList items={mediaItems} />
            {pagination.pageCount > 1 && (
              <div className="mt-6">
                <Pagination
                  pagination={pagination}
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

'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getMedia } from '@/actions/browse/get-media';
import MediaFilters from '@/components/media/media-list/media-filters';
import { MediaListContainer } from '@/components/media/media-list/media-list-container';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { PAGE_SIZE } from 'shared/consts';
import type { MediaFiltersType, MediaWithRelations } from '@/types/media-types';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<MediaWithRelations[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<MediaFiltersType>({
    search: '',
    category: 'all',
    hasExif: 'yes',
    hasLocation: 'all',
    hasThumbnail: 'yes',
    hasAnalysis: 'all',
    includeHidden: false,
    includeDeleted: false,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Calculate total pages based on total count and page size
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Fetch files based on current page and filters
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMedia(filters, currentPage, PAGE_SIZE);
      if (result.error) {
        throw new Error(result.error.message);
      }
      setTotalCount(result.count || 0);
      setMedia(result.data);
    } catch (error) {
      console.error('Error fetching files:', error);
      // You could add error UI handling here
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle filter change
  const handleFilterChange = (newFilters: MediaFiltersType) => {
    // Reset to first page when filters change
    setCurrentPage(1);
    setFilters(newFilters);
  };

  // Initial fetch and fetch when dependencies change
  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  return (
    <div className="h-full flex flex-col max-w-full p-0">
      <Card className="h-full flex flex-col border-0 rounded-none bg-transparent">
        <CardHeader className="px-6 py-4 border-b flex-row justify-between items-center">
          <CardTitle className="text-2xl">Media</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              {filtersOpen ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
        </CardHeader>

        {filtersOpen && (
          <div className="border-b bg-muted/30 p-4">
            <MediaFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

        <CardContent className="flex-1 min-h-0 p-0">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <MediaListContainer media={media} totalCount={totalCount} />
          )}
        </CardContent>

        <CardFooter className="px-6 py-4 border-t justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {totalCount} total files
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      handlePageChange(Math.max(1, currentPage - 1))
                    }
                    href="#"
                    aria-disabled={currentPage === 1}
                    className={
                      currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                    }
                  />
                </PaginationItem>

                {/* First page */}
                {currentPage > 3 && (
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => handlePageChange(1)}
                      href="#"
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                )}

                {/* Ellipsis if needed */}
                {currentPage > 4 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                {/* Pages around current page */}
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  // Show 2 pages before and after current page, or adjust for edges
                  let pageNum: number;

                  if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  // Skip if page number is out of range
                  if (pageNum < 1 || pageNum > totalPages) {
                    return null;
                  }

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        isActive={pageNum === currentPage}
                        onClick={() => handlePageChange(pageNum)}
                        href="#"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {/* Ellipsis if needed */}
                {currentPage < totalPages - 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                {/* Last page */}
                {currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => handlePageChange(totalPages)}
                      href="#"
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      handlePageChange(Math.min(totalPages, currentPage + 1))
                    }
                    href="#"
                    aria-disabled={currentPage === totalPages}
                    className={
                      currentPage === totalPages
                        ? 'pointer-events-none opacity-50'
                        : ''
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

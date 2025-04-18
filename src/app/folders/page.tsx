'use client';

import {
  getFolderStructure,
  getMediaItemsByFolder,
} from '@/app/actions/folders';
import FolderFilterBar, {
  type FolderFilters,
} from '@/components/folders/folder-filter-bar';
import FolderPagination from '@/components/folders/folder-pagination';
import FolderTree from '@/components/folders/folder-tree';
import FolderViewToggle from '@/components/folders/folder-view-toggle';
import MediaList from '@/components/folders/media-list';
import { PAGE_SIZE } from '@/lib/consts';
import type { MediaItem } from '@/types/db-types';
import type { FolderNode } from '@/types/folder-types';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

export default function FoldersPage() {
  const [folderStructure, setFolderStructure] = useState<FolderNode[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [pagination, setPagination] = useState<any>({
    page: 1,
    pageSize: PAGE_SIZE,
    pageCount: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentFolder, setCurrentFolder] = useState('/');
  const [includeSubfolders, setIncludeSubfolders] = useState(false);
  const [filters, setFilters] = useState<FolderFilters>({
    search: '',
    type: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
    hasThumbnail: 'all',
  });

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initial data loading
  useEffect(() => {
    const loadFolderStructure = async () => {
      try {
        const { success, data, error } = await getFolderStructure();
        if (success && data) {
          setFolderStructure(data);
        } else {
          console.error('Error loading folder structure:', error);
        }
      } catch (error) {
        console.error('Error fetching folder structure:', error);
      }
    };

    loadFolderStructure();
  }, []);

  // Effect for URL parameters
  useEffect(() => {
    const folder = searchParams.get('folder') || '/';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const subfolders = searchParams.get('subfolders') === 'true';

    // Extract filter values from URL
    const searchFilter = searchParams.get('search') || '';
    const typeFilter = (searchParams.get('type') ||
      'all') as FolderFilters['type'];
    const sortByFilter = (searchParams.get('sortBy') ||
      'date') as FolderFilters['sortBy'];
    const sortOrderFilter = (searchParams.get('sortOrder') ||
      'desc') as FolderFilters['sortOrder'];
    const hasThumbnailFilter = (searchParams.get('hasThumbnail') ||
      'all') as FolderFilters['hasThumbnail'];

    // Update state
    setCurrentFolder(folder);
    setIncludeSubfolders(subfolders);
    setFilters((filters) => ({
      ...filters,
      search: searchFilter,
      type: typeFilter,
      sortBy: sortByFilter,
      sortOrder: sortOrderFilter,
      hasThumbnail: hasThumbnailFilter,
    }));

    const loadMediaItems = async () => {
      // Only show loading indicator on initial load,
      // for subsequent loads we'll keep showing the existing content
      if (initialLoad) {
        setLoading(true);
      }

      try {
        // Apply filters to the request
        const { success, data, pagination, error } =
          await getMediaItemsByFolder(folder, page, PAGE_SIZE, subfolders, {
            search: searchFilter,
            type: typeFilter,
            sortBy: sortByFilter,
            sortOrder: sortOrderFilter,
            hasThumbnail: hasThumbnailFilter,
          });

        if (success && data) {
          setMediaItems(data);
          setPagination(
            pagination || {
              page,
              pageSize: PAGE_SIZE,
              pageCount: 1,
              total: data.length,
            },
          );
        } else {
          console.error('Error loading media items:', error);
          // Only clear media items if there's an error
          setMediaItems([]);
        }
      } catch (error) {
        console.error('Error fetching media items:', error);
        // Only clear media items if there's an error
        setMediaItems([]);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    loadMediaItems();
  }, [searchParams, initialLoad]);

  // Handle folder change
  const handleFolderSelect = useCallback(
    (folderPath: string) => {
      const params = new URLSearchParams();
      params.set('folder', folderPath);
      params.set('page', '1');
      if (includeSubfolders) {
        params.set('subfolders', 'true');
      }
      // Preserve any active filters
      if (filters.search) params.set('search', filters.search);
      if (filters.type !== 'all') params.set('type', filters.type);
      if (filters.sortBy !== 'date') params.set('sortBy', filters.sortBy);
      if (filters.sortOrder !== 'desc')
        params.set('sortOrder', filters.sortOrder);
      if (filters.hasThumbnail !== 'all')
        params.set('hasThumbnail', filters.hasThumbnail);

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, includeSubfolders, filters],
  );

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams);
      params.set('page', page.toString());
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  // Handle subfolder toggle
  const handleSubfolderToggle = useCallback(
    (include: boolean) => {
      const params = new URLSearchParams(searchParams);
      if (include) {
        params.set('subfolders', 'true');
      } else {
        params.delete('subfolders');
      }
      params.set('page', '1'); // Reset to first page on toggle
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters: FolderFilters) => {
      const params = new URLSearchParams(searchParams);
      if (newFilters.search) {
        params.set('search', newFilters.search);
      } else {
        params.delete('search');
      }
      if (newFilters.type && newFilters.type !== 'all') {
        params.set('type', newFilters.type);
      } else {
        params.delete('type');
      }
      if (newFilters.sortBy && newFilters.sortBy !== 'date') {
        params.set('sortBy', newFilters.sortBy);
      } else {
        params.delete('sortBy');
      }
      if (newFilters.sortOrder && newFilters.sortOrder !== 'desc') {
        params.set('sortOrder', newFilters.sortOrder);
      } else {
        params.delete('sortOrder');
      }
      if (newFilters.hasThumbnail && newFilters.hasThumbnail !== 'all') {
        params.set('hasThumbnail', newFilters.hasThumbnail);
      } else {
        params.delete('hasThumbnail');
      }
      params.set('page', '1'); // Reset to first page on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Folder View</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sidebar - folder tree */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="sticky top-20">
            <h2 className="text-xl font-bold mb-4">Folders</h2>
            <Suspense fallback={<div>Loading folders...</div>}>
              <FolderTree
                folders={folderStructure}
                currentFolder={currentFolder}
                onSelect={handleFolderSelect}
              />
            </Suspense>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold truncate">
              {currentFolder === '/'
                ? 'All Files'
                : currentFolder.split('/').pop()}
            </h2>
            <FolderViewToggle
              includeSubfolders={includeSubfolders}
              onChange={handleSubfolderToggle}
            />
          </div>

          {/* Filter bar */}
          <FolderFilterBar
            totalCount={pagination.total}
            onFiltersChange={handleFiltersChange}
          />

          {initialLoad && loading ? (
            <div className="py-12 text-center">Loading media items...</div>
          ) : (
            <div className="relative">
              {!initialLoad && loading && (
                <div className="absolute top-0 right-0 z-10 mt-2 mr-2">
                  <div className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-md animate-pulse">
                    Loading...
                  </div>
                </div>
              )}

              <MediaList items={mediaItems} />
              {pagination.pageCount > 1 && (
                <div className="mt-6">
                  <FolderPagination
                    currentPage={pagination.page}
                    totalPages={pagination.pageCount}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

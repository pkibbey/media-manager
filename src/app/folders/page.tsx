'use client';

import {
  getFolderStructure,
  getMediaItemsByFolder,
} from '@/app/actions/folders';
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
  const [currentFolder, setCurrentFolder] = useState('/');
  const [includeSubfolders, setIncludeSubfolders] = useState(false);
  const [folderStats, setFolderStats] = useState<{
    currentFolderCount: number;
    subfolderCount: number;
  }>({
    currentFolderCount: 0,
    subfolderCount: 0,
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

    setCurrentFolder(folder);
    setIncludeSubfolders(subfolders);

    const loadMediaItems = async () => {
      setLoading(true);
      try {
        // First get count for current folder only
        const currentFolderResult = await getMediaItemsByFolder(
          folder,
          1,
          1,
          false,
        );
        const currentFolderCount = currentFolderResult.pagination?.total || 0;

        // Then get items based on the requested view mode
        const { success, data, pagination, error } =
          await getMediaItemsByFolder(folder, page, PAGE_SIZE, subfolders);

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

          // Calculate folder statistics
          const totalCount = pagination?.total || data.length;
          const subfolderCount = totalCount - currentFolderCount;

          setFolderStats({
            currentFolderCount,
            subfolderCount: subfolderCount > 0 ? subfolderCount : 0,
          });
        } else {
          console.error('Error loading media items:', error);
          setMediaItems([]);
        }
      } catch (error) {
        console.error('Error fetching media items:', error);
        setMediaItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadMediaItems();
  }, [searchParams]);

  // Handle folder change
  const handleFolderSelect = useCallback(
    (folderPath: string) => {
      const params = new URLSearchParams();
      params.set('folder', folderPath);
      params.set('page', '1');
      if (includeSubfolders) {
        params.set('subfolders', 'true');
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, includeSubfolders],
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

          {/* Folder stats bar */}
          {!loading && folderStats.subfolderCount > 0 && (
            <div
              className={`text-sm rounded-lg p-3 mb-4 
              ${
                includeSubfolders
                  ? 'bg-primary/10 border border-primary/20'
                  : 'bg-muted/50 border border-border'
              }`}
            >
              <div className="flex justify-between">
                <span>
                  <strong>{folderStats.currentFolderCount}</strong> items in
                  current folder
                </span>
                <span>
                  <strong>{folderStats.subfolderCount}</strong> items in
                  subfolders
                </span>
                <span className="font-medium">
                  {includeSubfolders
                    ? `Showing all ${pagination.total} items`
                    : `Showing ${folderStats.currentFolderCount} items from this folder only`}
                </span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">Loading media items...</div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

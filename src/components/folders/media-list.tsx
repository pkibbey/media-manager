'use client';

import {
  cn,
  formatBytes,
  formatDate,
  getKeyboardNavigationIndex,
} from '@/lib/utils';
import type { Tables } from '@/types/supabase';
import {
  FileIcon,
  FileTextIcon,
  ImageIcon,
  PlayIcon,
} from '@radix-ui/react-icons';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type MediaItem = Tables<'media_items'>;

interface MediaListProps {
  items: MediaItem[];
}

export default function MediaList({ items }: MediaListProps) {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const [columnsCount, setColumnsCount] = useState<number>(4); // Default value

  useEffect(() => {
    // Reset refs array when items change
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items]);

  // Detect grid columns count for keyboard navigation
  useEffect(() => {
    if (gridRef.current) {
      const updateColumnsCount = () => {
        const gridComputedStyle =
          gridRef.current && window.getComputedStyle(gridRef.current);
        const gridTemplateColumns = gridComputedStyle?.getPropertyValue(
          'grid-template-columns',
        );
        const columnCount = gridTemplateColumns?.split(' ').length || 0;
        setColumnsCount(columnCount);
      };

      // Initial calculation
      updateColumnsCount();

      // Recalculate on window resize
      const resizeObserver = new ResizeObserver(updateColumnsCount);
      resizeObserver.observe(gridRef.current);

      return () => {
        if (gridRef.current) resizeObserver.unobserve(gridRef.current);
      };
    }
  }, []);

  // Handle keyboard navigation
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (items.length === 0) return;

    // Handle arrow keys for navigation
    if (
      [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
      ].includes(e.key)
    ) {
      e.preventDefault();

      const newIndex = getKeyboardNavigationIndex(
        focusedIndex === -1 ? 0 : focusedIndex,
        e.key,
        items.length,
        columnsCount,
      );

      setFocusedIndex(newIndex);
      itemRefs.current[newIndex]?.focus();
    }

    // Enter or Space to view the selected item
    else if ((e.key === 'Enter' || e.key === ' ') && focusedIndex >= 0) {
      e.preventDefault();
      setSelectedItem(items[focusedIndex]);
    }

    // Escape to close the modal
    else if (e.key === 'Escape' && selectedItem) {
      e.preventDefault();
      setSelectedItem(null);

      // Keep focus on the item that was previously selected
      const previousIndex = items.findIndex(
        (item) => item.id === selectedItem.id,
      );
      if (previousIndex >= 0) {
        setFocusedIndex(previousIndex);
        setTimeout(() => {
          itemRefs.current[previousIndex]?.focus();
        }, 0);
      }
    }
  };

  if (items.length === 0) {
    return null;
  }

  // Determine if media can be displayed natively
  const canDisplayNatively = (item: MediaItem) => {
    const imageExtensions = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'avif',
      'svg',
    ];
    const videoExtensions = ['mp4', 'webm', 'ogg'];

    return (
      imageExtensions.includes(item.extension) ||
      videoExtensions.includes(item.extension)
    );
  };

  // Get appropriate icon for media type
  const getMediaIcon = (item: MediaItem) => {
    const extension = item.extension.toLowerCase();

    if (
      [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'avif',
        'svg',
        'heic',
        'tiff',
      ].includes(extension)
    ) {
      return <ImageIcon className="h-6 w-6" />;
    }
    if (['mp4', 'webm', 'mov', 'avi', 'wmv', 'mkv'].includes(extension)) {
      return <PlayIcon className="h-6 w-6" />;
    }
    if (['json', 'txt', 'csv', 'xml'].includes(extension)) {
      return <FileTextIcon className="h-6 w-6" />;
    }
    return <FileIcon className="h-6 w-6" />;
  };

  // Handle modal keyboard navigation
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    // Navigate between items in the modal with arrow keys
    if (e.key === 'ArrowRight' && selectedItem) {
      e.preventDefault();
      const currentIndex = items.findIndex(
        (item) => item.id === selectedItem.id,
      );
      if (currentIndex < items.length - 1) {
        setSelectedItem(items[currentIndex + 1]);
      }
    } else if (e.key === 'ArrowLeft' && selectedItem) {
      e.preventDefault();
      const currentIndex = items.findIndex(
        (item) => item.id === selectedItem.id,
      );
      if (currentIndex > 0) {
        setSelectedItem(items[currentIndex - 1]);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Grid of media items */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        ref={gridRef}
        role="grid"
        onKeyDown={handleGridKeyDown}
        aria-label="Media items grid"
        tabIndex={-1}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedItem(item);
              }
            }}
            tabIndex={0}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            role="gridcell"
            aria-label={`${item.file_name}, ${formatBytes(item.size_bytes)}`}
            aria-selected={focusedIndex === index}
            data-focus-visible-added={focusedIndex === index}
            onFocus={() => setFocusedIndex(index)}
            className={cn(
              'border rounded-md overflow-hidden bg-card hover:border-primary transition-colors cursor-pointer',
              focusedIndex === index
                ? 'border-primary ring-2 ring-primary/20'
                : '',
            )}
          >
            {/* Media thumbnail or placeholder */}
            <div className="aspect-square bg-muted relative flex items-center justify-center">
              {canDisplayNatively(item) &&
              item.extension.match(/^(jpg|jpeg|png|gif|webp|avif)$/) ? (
                <Image
                  src={`/api/media?id=${item.id}`}
                  alt={item.file_name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover"
                  unoptimized // Until we have a proper thumbnail service
                />
              ) : (
                <div className="text-muted-foreground">
                  {getMediaIcon(item)}
                </div>
              )}
            </div>

            {/* File name and details */}
            <div className="p-2 space-y-1">
              <p
                className="text-sm font-medium truncate"
                title={item.file_name}
              >
                {item.file_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(item.size_bytes)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Media viewer modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
          onKeyDown={handleModalKeyDown}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-modal-title"
        >
          <div
            className="bg-card rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSelectedItem(null);
              }
            }}
            tabIndex={0}
            aria-label={`${selectedItem.file_name} details`}
          >
            {/* Modal header */}
            <div className="p-4 border-b flex justify-between items-center">
              <h3
                className="text-lg font-medium truncate"
                id="media-modal-title"
              >
                {selectedItem.file_name}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-full hover:bg-muted"
                aria-label="Close media preview"
              >
                ×
              </button>
            </div>

            {/* Modal content */}
            <div className="flex-1 overflow-auto p-4">
              <div className="flex flex-col md:flex-row md:gap-8">
                {/* Media preview */}
                <div className="md:flex-1 flex items-center justify-center bg-black/30 rounded-md p-4">
                  {canDisplayNatively(selectedItem) ? (
                    selectedItem.extension.match(/^(mp4|webm|ogg)$/) ? (
                      <video
                        muted
                        src={`/api/media?id=${selectedItem.id}`}
                        controls
                        className="max-h-[70vh] max-w-full"
                      />
                    ) : (
                      <Image
                        src={`/api/media?id=${selectedItem.id}`}
                        alt={selectedItem.file_name}
                        width={800}
                        height={600}
                        className="max-h-[70vh] w-auto h-auto object-contain"
                        unoptimized
                      />
                    )
                  ) : (
                    <div className="text-center p-8">
                      <div className="flex justify-center mb-2">
                        {getMediaIcon(selectedItem)}
                      </div>
                      <p>
                        Preview not available for this file type (.
                        {selectedItem.extension})
                      </p>
                    </div>
                  )}
                </div>

                {/* File details */}
                <div className="md:w-64 mt-4 md:mt-0">
                  <h4 className="font-medium mb-2">File Details</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">File name</dt>
                      <dd className="truncate">{selectedItem.file_name}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd>.{selectedItem.extension}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Size</dt>
                      <dd>{formatBytes(selectedItem.size_bytes)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Date modified</dt>
                      <dd>{formatDate(selectedItem.modified_date)}</dd>
                    </div>
                    {selectedItem.created_date && (
                      <div>
                        <dt className="text-muted-foreground">Date created</dt>
                        <dd>{formatDate(selectedItem.created_date)}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted-foreground">Folder</dt>
                      <dd className="truncate">{selectedItem.folder_path}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* Modal footer with navigation buttons */}
            <div className="p-4 border-t flex justify-between">
              {/* Previous button */}
              <button
                onClick={() => {
                  const currentIndex = items.findIndex(
                    (item) => item.id === selectedItem.id,
                  );
                  if (currentIndex > 0) {
                    setSelectedItem(items[currentIndex - 1]);
                  }
                }}
                disabled={
                  items.findIndex((item) => item.id === selectedItem.id) === 0
                }
                className="px-4 py-2 rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
                aria-label="Previous item"
              >
                Previous
              </button>

              {/* Close button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-md border hover:bg-muted transition-colors"
                aria-label="Close"
              >
                Close
              </button>

              {/* Next button */}
              <button
                onClick={() => {
                  const currentIndex = items.findIndex(
                    (item) => item.id === selectedItem.id,
                  );
                  if (currentIndex < items.length - 1) {
                    setSelectedItem(items[currentIndex + 1]);
                  }
                }}
                disabled={
                  items.findIndex((item) => item.id === selectedItem.id) ===
                  items.length - 1
                }
                className="px-4 py-2 rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
                aria-label="Next item"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

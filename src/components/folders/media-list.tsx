'use client';

import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';
import { bytesToSize } from '@/lib/utils';
import {
  FileIcon,
  MixerHorizontalIcon,
  VideoIcon,
} from '@radix-ui/react-icons';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import MediaDetail from '../media/media-detail';

interface MediaListProps {
  items: any[];
}

export default function MediaList({ items }: MediaListProps) {
  const [selectedMediaItem, setSelectedMediaItem] = useState<any | null>(null);
  const [columnCount, setColumnCount] = useState(4); // Default column count
  const gridRef = useRef<HTMLDivElement>(null);

  // Detect grid column count for keyboard navigation
  useEffect(() => {
    const updateColumnCount = () => {
      if (!gridRef.current) return;

      // Get computed style to determine grid columns
      const computedStyle = window.getComputedStyle(gridRef.current);
      const gridColumns = computedStyle.getPropertyValue(
        'grid-template-columns',
      );
      const columnsCount = gridColumns.split(' ').length;

      setColumnCount(columnsCount || 4); // Default to 4 if we can't determine
    };

    // Initial detection
    updateColumnCount();

    // Re-detect on resize
    const resizeObserver = new ResizeObserver(updateColumnCount);
    if (gridRef.current) {
      resizeObserver.observe(gridRef.current);
    }

    return () => {
      if (gridRef.current) {
        resizeObserver.unobserve(gridRef.current);
      }
    };
  }, []);

  // Set up keyboard navigation
  const { focusedIndex, isNavigating } = useKeyboardNavigation(
    items.length,
    columnCount,
    (index) => {
      // Handle item selection
      setSelectedMediaItem(items[index]);
    },
  );

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <MixerHorizontalIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No media found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or browsing another folder.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        ref={gridRef}
        role="grid"
        aria-label="Media items grid"
      >
        {items.map((item, index) => (
          <MediaCard
            key={item.id}
            item={item}
            index={index}
            onClick={() => setSelectedMediaItem(item)}
            isFocused={isNavigating && focusedIndex === index}
          />
        ))}
      </div>

      {selectedMediaItem && (
        <MediaDetail
          item={selectedMediaItem}
          isOpen={Boolean(selectedMediaItem)}
          onClose={() => setSelectedMediaItem(null)}
        />
      )}
    </>
  );
}

interface MediaCardProps {
  item: any;
  index: number;
  onClick: () => void;
  isFocused: boolean;
}

function MediaCard({ item, index, onClick, isFocused }: MediaCardProps) {
  const isImage = item.type === 'image';
  const isVideo = item.type === 'video';
  const fileExtension = item.file_name.split('.').pop()?.toLowerCase();

  // Show a visual indicator for processed items
  const isProcessed = item.processed;

  // Get folder name for display in subfolder mode
  const folderName = item.folder_path.split('/').filter(Boolean).pop();

  return (
    <div
      className={`group relative bg-muted rounded-md overflow-hidden cursor-pointer transition-all
        ${
          isFocused
            ? 'ring-2 ring-primary shadow-md scale-[1.02] z-10'
            : 'hover:ring-2 hover:ring-primary/50'
        }`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // Prevent page scroll on space
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View ${item.file_name}`}
      data-index={index}
      aria-selected={isFocused}
    >
      <div className="aspect-square relative">
        {isImage ? (
          <div className="w-full h-full relative">
            <Image
              src={`/api/media?id=${item.id}&thumbnail=true`}
              alt={item.file_name}
              fill
              className="object-cover"
            />
          </div>
        ) : isVideo ? (
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            <VideoIcon className="h-12 w-12 text-white opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs rounded px-1 py-0.5">
              VIDEO
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center">
              <FileIcon className="h-10 w-10 text-muted-foreground" />
              <span className="text-xs font-medium mt-2">
                {fileExtension ? `.${fileExtension.toUpperCase()}` : 'FILE'}
              </span>
            </div>
          </div>
        )}

        {/* Metadata indicators */}
        <div className="absolute top-2 right-2 flex gap-1">
          {isProcessed && (
            <div
              className="h-2 w-2 rounded-full bg-green-500"
              title="Metadata processed"
            />
          )}
          {item.latitude && item.longitude && (
            <div
              className="h-2 w-2 rounded-full bg-blue-500"
              title="Location data available"
            />
          )}
        </div>

        {/* Folder indicator - only shown if folderName exists */}
        {folderName && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs rounded px-1 py-0.5 max-w-[80%] truncate">
            {folderName}
          </div>
        )}
      </div>

      <div className="p-2 text-xs">
        <div className="truncate font-medium" title={item.file_name}>
          {item.file_name}
        </div>
        <div className="text-muted-foreground">
          {bytesToSize(item.size || 0)}
        </div>
      </div>
    </div>
  );
}

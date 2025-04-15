'use client';

import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';
import { useRangeSelection } from '@/hooks/use-range-selection';
import { bytesToSize } from '@/lib/utils';
import {
  CheckIcon,
  FileIcon,
  MixerHorizontalIcon,
  VideoIcon,
} from '@radix-ui/react-icons';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import BatchActionBar from '../media/batch-action-bar';
import MediaDetail from '../media/media-detail';

interface MediaListProps {
  items: any[];
}

export default function MediaList({ items }: MediaListProps) {
  const [selectedMediaItem, setSelectedMediaItem] = useState<any | null>(null);
  const [columnCount, setColumnCount] = useState(4); // Default column count
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Track shift key state to prevent text selection
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // For keyboard navigation
  const { focusedIndex, isNavigating } = useKeyboardNavigation(
    items.length,
    columnCount,
    // Handle Enter key - select item
    (index) => {
      if (items[index]) {
        toggleSelection(items[index].id);
      }
    },
    // Handle Space key - preview item
    (index) => {
      if (items[index]) {
        setSelectedMediaItem(items[index]);
        setIsDetailPanelOpen(true);
      }
    },
  );

  // --- useRangeSelection hook integration ---
  const {
    selectedItems,
    toggleSelection,
    selectRange,
    clearSelection,
    selectAll,
    handleItemClick,
    handleItemMouseDown,
    handleItemMouseUp,
    handleItemMouseLeave,
    lastSelectedIndex,
  } = useRangeSelection({
    items,
    idExtractor: (item) => item.id,
  });

  // Track shift key to prevent text selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isShiftPressed) {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    // Handle page visibility change (in case shift is released while page is not visible)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isShiftPressed) {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isShiftPressed]);

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

  // Handle keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      (window as any).__lastKeyEvent = e;
      // Ctrl+A or Cmd+A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && items.length > 0) {
        e.preventDefault();
        selectAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [items, selectAll]);

  // Get array of selected items
  const selectedItemsArray = Array.from(selectedItems)
    .map((id) => items.find((item) => item.id === id))
    .filter(Boolean);

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
        className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 transition-all duration-300 
          ${isDetailPanelOpen ? 'md:mr-[33%] lg:mr-[25%] xl:mr-[33%]' : ''}
          ${isShiftPressed ? 'select-none' : ''}`}
        ref={gridRef}
        role="grid"
        aria-label="Media items grid"
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((item, index) => (
          <MediaCard
            key={item.id}
            item={item}
            index={index}
            onClick={(e) => {
              // If not handled by selection, open detail panel
              const result = handleItemClick(item, index, e);
              if (result === null) {
                setSelectedMediaItem(item);
                setIsDetailPanelOpen(true);
              }
            }}
            onMouseDown={(e) => handleItemMouseDown(item, index, e)}
            onMouseUp={handleItemMouseUp}
            onMouseLeave={handleItemMouseLeave}
            isFocused={isNavigating && focusedIndex === index}
            isSelected={selectedItems.has(item.id)}
            onToggleSelect={(e) => toggleSelection(item.id, e)}
            selectionMode={true}
            isPressing={false} // Optionally wire up isPressing if needed
          />
        ))}
      </div>

      {/* Media Detail Side Panel */}
      {selectedMediaItem && (
        <MediaDetail
          item={selectedMediaItem}
          isOpen={isDetailPanelOpen}
          onClose={() => setIsDetailPanelOpen(false)}
        />
      )}

      {/* Batch action bar */}
      {selectedItems.size > 0 && (
        <BatchActionBar
          selectedItems={selectedItemsArray}
          onClearSelection={clearSelection}
        />
      )}
    </>
  );
}

interface MediaCardProps {
  item: any;
  index: number;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  isFocused: boolean;
  isSelected?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
  selectionMode?: boolean;
  isPressing: boolean;
}

function MediaCard({
  item,
  index,
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  isFocused,
  isSelected = false,
  onToggleSelect,
  selectionMode = false,
  isPressing,
}: MediaCardProps) {
  const isImage = item.type === 'image';
  const isVideo = item.type === 'video';
  const fileExtension = item.file_name.split('.').pop()?.toLowerCase();

  // Show a visual indicator for processed items
  const isProcessed = item.processed;

  // Get folder name for display in subfolder mode
  const folderName = item.folder_path.split('/').filter(Boolean).pop();

  // Handle toggle click separately to prevent event conflicts
  const handleToggleClick = (e: React.MouseEvent) => {
    if (onToggleSelect) {
      e.preventDefault();
      e.stopPropagation(); // Important: prevent the click from bubbling up
      onToggleSelect(e);
    }
  };

  return (
    <div
      className={`group relative bg-muted rounded-md overflow-hidden cursor-pointer transition-all
        ${
          isFocused
            ? 'ring-2 ring-primary shadow-md scale-[1.02] z-10'
            : isSelected
              ? 'ring-2 ring-primary bg-primary/10'
              : 'hover:ring-2 hover:ring-primary/50'
        }`}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          // Enter key always selects the item
          if (onToggleSelect) {
            onToggleSelect(e as any);
          }
        } else if (e.key === ' ') {
          e.preventDefault(); // Prevent page scroll on space
          // Space key opens the preview
          onClick(e as any);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${selectionMode ? 'Select' : 'View'} ${item.file_name}`}
      data-index={index}
      aria-selected={isFocused || isSelected}
    >
      {/* Selection checkbox */}
      {(selectionMode || isSelected) && (
        <div
          className="absolute top-2 left-2 z-10 bg-background rounded-full p-0.5 shadow cursor-pointer"
          onClick={handleToggleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (onToggleSelect) {
                onToggleSelect(e as any);
              }
            }
          }}
          role="checkbox"
          aria-checked={isSelected}
          tabIndex={selectionMode ? 0 : -1}
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center
            ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted/80 border'}`}
          >
            {isSelected && <CheckIcon className="h-3 w-3" />}
          </div>
        </div>
      )}

      <div className="aspect-square relative">
        {isImage ? (
          <div className="w-full h-full relative">
            <Image
              src={`/api/media?id=${item.id}&thumbnail=true`}
              alt={item.file_name}
              fill
              className={`object-cover ${isSelected ? 'opacity-90' : ''}`}
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
        {folderName && !selectionMode && (
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

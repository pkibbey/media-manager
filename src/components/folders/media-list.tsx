'use client';

import type { MediaItem } from '@/types/db-types';
import { MixerHorizontalIcon } from '@radix-ui/react-icons';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import MediaDetail from '../media/media-detail';
import MediaCard from './media-card';

// Create a context for handling selected media items
interface MediaSelectionContextType {
  selectedItemId: string | null;
  selectedItem: MediaItem | null;
  selectedItemIds: Set<string>;
  selectedItems: MediaItem[];
  selectItem: (item: MediaItem, multiSelect?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  isSelected: (itemId: string) => boolean;
}

// Export the context so it can be used by other components
export const MediaSelectionContext = createContext<MediaSelectionContextType>({
  selectedItemId: null,
  selectedItem: null,
  selectedItemIds: new Set(),
  selectedItems: [],
  selectItem: () => {},
  clearSelection: () => {},
  selectAll: () => {},
  isSelected: () => false,
});

// Export a hook for easier context consumption
export function useMediaSelection() {
  return useContext(MediaSelectionContext);
}

interface MediaListProps {
  items: MediaItem[];
  filterComponent?: React.ReactNode;
}

export default function MediaList({ items, filterComponent }: MediaListProps) {
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaItem | null>(
    null,
  );
  const [selectedMediaItems, setSelectedMediaItems] = useState<MediaItem[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  // Auto-select the first image when items are loaded and no item is currently selected
  useEffect(() => {
    if (
      items.length > 0 &&
      !selectedMediaItem &&
      selectedMediaItems.length === 0
    ) {
      setSelectedMediaItem(items[0]);
      setSelectedMediaItems([items[0]]);
    }
  }, [items, selectedMediaItem, selectedMediaItems]);

  // Handle keyboard events for the grid
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    // Handle Ctrl+A to select all items
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      setSelectedMediaItems([...items]);
      // Keep the last selected item as the primary selected item
      if (!selectedMediaItem && items.length > 0) {
        setSelectedMediaItem(items[0]);
      }
    }
  };

  // Create a set of selected item IDs for faster lookups
  const selectedIds = new Set(selectedMediaItems.map((item) => item.id));

  // Create context value with both single and multi-selection functionality
  const contextValue = {
    selectedItemId: selectedMediaItem?.id || null,
    selectedItem: selectedMediaItem,
    selectedItemIds: selectedIds,
    selectedItems: selectedMediaItems,
    selectItem: (item: MediaItem, multiSelect = false) => {
      if (multiSelect) {
        // For multi-selection, toggle the item's selection status
        setSelectedMediaItems((prev) => {
          const isAlreadySelected = prev.some((i) => i.id === item.id);
          if (isAlreadySelected) {
            const newSelection = prev.filter((i) => i.id !== item.id);
            // If removing the current primary selection, set a new one or null
            if (selectedMediaItem?.id === item.id) {
              setSelectedMediaItem(
                newSelection.length > 0 ? newSelection[0] : null,
              );
            }
            return newSelection;
          }

          // Always set the most recently added item as the primary selection
          setSelectedMediaItem(item);
          return [...prev, item];
        });
      } else {
        // For single selection, clear previous selection and select only this item
        setSelectedMediaItem(item);
        setSelectedMediaItems([item]);
      }
    },
    clearSelection: () => {
      setSelectedMediaItem(null);
      setSelectedMediaItems([]);
    },
    selectAll: () => {
      setSelectedMediaItems([...items]);
      // Keep the last selected item as the primary selection or select the first item
      if (!selectedMediaItem && items.length > 0) {
        setSelectedMediaItem(items[0]);
      }
    },
    isSelected: (itemId: string) => selectedIds.has(itemId),
  };

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
    <MediaSelectionContext.Provider value={contextValue}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_500px] gap-4 md:gap-6">
        <div className="flex flex-col space-y-6">
          {filterComponent}
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm">
              {selectedMediaItems.length > 1 && (
                <span className="text-primary">
                  {selectedMediaItems.length} items selected
                </span>
              )}
            </div>
            {selectedMediaItems.length > 0 && (
              <button
                onClick={() => contextValue.clearSelection()}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Clear selection
              </button>
            )}
          </div>
          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-max content-start"
            ref={gridRef}
            role="grid"
            aria-label="Media items grid"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onContextMenu={(e) => e.preventDefault()}
          >
            {items.map((item, index) => (
              <MemoizedMediaCard key={item.id} item={item} index={index} />
            ))}
          </div>
        </div>

        <div className="flex flex-col space-y-4">
          <MediaDetail />
        </div>
      </div>
    </MediaSelectionContext.Provider>
  );
}

// Memoized version of MediaCard that only re-renders when necessary
const MemoizedMediaCard = memo(
  function MemoizedMediaCard({
    item,
    index,
  }: {
    item: MediaItem;
    index: number;
  }) {
    const { selectItem, isSelected } = useMediaSelection();

    return (
      <MediaCard
        item={item}
        index={index}
        isSelected={isSelected(item.id)}
        onClick={(e) => {
          // Use Ctrl/Cmd + Click for multi-selection
          const multiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
          selectItem(item, multiSelect);
        }}
      />
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if the item ID changes
    return prevProps.item.id === nextProps.item.id;
  },
);

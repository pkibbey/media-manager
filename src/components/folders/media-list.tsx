'use client';

import type { MediaItem } from '@/types/db-types';
import { MixerHorizontalIcon } from '@radix-ui/react-icons';
import { createContext, memo, useContext, useRef, useState } from 'react';
import MediaDetail from '../media/media-detail';
import MediaCard from './media-card';

// Create a context for handling selected media item
interface MediaSelectionContextType {
  selectedItemId: string | null;
  selectedItem: MediaItem | null;
  selectItem: (item: MediaItem) => void;
}

// Export the context so it can be used by other components
export const MediaSelectionContext = createContext<MediaSelectionContextType>({
  selectedItemId: null,
  selectedItem: null,
  selectItem: () => {},
});

// Export a hook for easier context consumption
export function useMediaSelection() {
  return useContext(MediaSelectionContext);
}

interface MediaListProps {
  items: MediaItem[];
}

export default function MediaList({ items }: MediaListProps) {
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaItem | null>(
    null,
  );
  const gridRef = useRef<HTMLDivElement>(null);

  // Create context value with both ID and full item
  const contextValue = {
    selectedItemId: selectedMediaItem?.id || null,
    selectedItem: selectedMediaItem,
    selectItem: (item: MediaItem) => {
      setSelectedMediaItem(item);
    },
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
      <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] lg:grid-cols-[1fr_700px] gap-4">
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-max content-start"
          ref={gridRef}
          role="grid"
          aria-label="Media items grid"
          onContextMenu={(e) => e.preventDefault()}
        >
          {items.map((item, index) => (
            <MemoizedMediaCard key={item.id} item={item} index={index} />
          ))}
        </div>
        <MediaDetail />
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
    const { selectItem } = useMediaSelection();

    return (
      <MediaCard
        item={item}
        index={index}
        onClick={(_e) => {
          selectItem(item);
        }}
      />
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if the item ID changes
    return prevProps.item.id === nextProps.item.id;
  },
);

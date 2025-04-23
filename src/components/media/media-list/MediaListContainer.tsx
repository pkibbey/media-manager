'use client';

import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { MediaItem } from '@/types/db-types';
import MediaDetail from '../media-detail';
import { EmptyMediaState } from './EmptyMediaState';
import { MediaGrid } from './MediaGrid';
import { MediaSelectionContext } from './MediaSelectionContext';
import { useMediaSelectionProvider } from './useMediaSelectionProvider';

interface MediaListContainerProps {
  items: MediaItem[];
  filterComponent?: React.ReactNode;
}

export function MediaListContainer({
  items,
  filterComponent,
}: MediaListContainerProps) {
  const mediaSelectionContext = useMediaSelectionProvider(items);
  const { selectAll } = mediaSelectionContext;

  // Handle keyboard events for the grid
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    // Handle Ctrl+A to select all items
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      selectAll();
    }
  };

  if (!items.length) {
    return (
      <>
        {filterComponent}
        <EmptyMediaState />
      </>
    );
  }

  return (
    <MediaSelectionContext.Provider value={mediaSelectionContext}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_500px] gap-4 md:gap-6">
        <MediaGrid items={items} onKeyDown={handleKeyDown} />
        <div className="flex flex-col space-y-4">
          <MediaDetail />
        </div>
      </div>
    </MediaSelectionContext.Provider>
  );
}

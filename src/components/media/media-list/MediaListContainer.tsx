'use client';

import { useRouter } from 'next/navigation';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { updateMediaVisibility } from '@/actions/media/update-visibility';
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
  const router = useRouter();
  const mediaSelectionContext = useMediaSelectionProvider(items);
  const { selectAll, selectedItems } = mediaSelectionContext;
  const [processing, setProcessing] = useState(false);

  // Handle keyboard events for the grid
  const handleKeyDown = async (e: ReactKeyboardEvent<HTMLDivElement>) => {
    // Handle Ctrl+A to select all items
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      selectAll();
      return;
    }

    // Skip if no items are selected or if we're already processing
    if (selectedItems.length === 0 || processing) return;

    // Mark as deleted when 'D' key is pressed
    if (e.key.toLowerCase() === 'd') {
      e.preventDefault();
      await handleVisibilityChange('delete');
      return;
    }

    // Mark as hidden when 'H' key is pressed (H for "hide")
    if (e.key.toLowerCase() === 'h') {
      e.preventDefault();
      await handleVisibilityChange('hide');
      return;
    }
  };

  // Handle visibility changes (delete/hide)
  const handleVisibilityChange = async (action: 'delete' | 'hide') => {
    if (selectedItems.length === 0) return;

    setProcessing(true);
    const isDelete = action === 'delete';
    const actionText = isDelete ? 'deleted' : 'hidden';

    try {
      // Process each selected item
      const promises = selectedItems.map((item) =>
        updateMediaVisibility({
          mediaId: item.id,
          isDeleted: isDelete ? true : undefined,
          isHidden: !isDelete ? true : undefined,
        }),
      );

      await Promise.all(promises);

      toast.success(
        `${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} marked as ${actionText}`,
      );

      // Refresh the page to update the media list
      router.refresh();
    } catch (error) {
      toast.error(`Failed to mark items as ${actionText}`);
      console.error(`Error marking items as ${actionText}:`, error);
    } finally {
      setProcessing(false);
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

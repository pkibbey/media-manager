'use client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMediaLightbox } from '@/contexts/media-lightbox-context';
import { useWindowWidth } from '@/hooks/useWindowWidth';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo } from 'react';

import type { MediaWithRelations } from 'shared/types';
import { MediaGrid } from './media-grid';
import { MediaSelectionActions } from './media-selection-actions';
import {
  MediaSelectionProvider,
  useMediaSelection,
} from './media-selection-context';

interface MediaListContainerProps {
  media: MediaWithRelations[];
}

// Inner component to handle keyboard events
function MediaKeyboardHandler({
  children,
  columns,
  media,
}: {
  children: ReactNode;
  columns: number;
  media: MediaWithRelations[];
}) {
  const {
    selectAll,
    toggleHideSelected,
    toggleDeleteSelected,
    selection,
    navigateSelection,
  } = useMediaSelection();
  const { openLightbox, closeLightbox, isOpen } = useMediaLightbox();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle keyboard shortcuts if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Select all: Ctrl+A or Command+A
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        selectAll();
      }

      // Arrow key navigation
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
      ) {
        event.preventDefault();
        const direction = event.key.replace('Arrow', '').toLowerCase() as
          | 'up'
          | 'down'
          | 'left'
          | 'right';

        // Get the target media ID before navigating
        let targetMediaId: string | null = null;
        if (media && media.length > 0) {
          let targetIndex = 0;

          if (selection.lastSelectedId) {
            const currentIndex = media.findIndex(
              (file: MediaWithRelations) =>
                file.id === selection.lastSelectedId,
            );
            if (currentIndex !== -1) {
              switch (direction) {
                case 'left':
                  targetIndex = Math.max(0, currentIndex - 1);
                  break;
                case 'right':
                  targetIndex = Math.min(media.length - 1, currentIndex + 1);
                  break;
                case 'up':
                  targetIndex = Math.max(0, currentIndex - columns);
                  break;
                case 'down':
                  targetIndex = Math.min(
                    media.length - 1,
                    currentIndex + columns,
                  );
                  break;
              }
            }
          }

          if (targetIndex >= 0 && targetIndex < media.length) {
            targetMediaId = media[targetIndex].id;
          }
        }

        navigateSelection(direction, columns);

        // If lightbox is open and we have a target, update the lightbox
        if (isOpen && targetMediaId) {
          openLightbox(targetMediaId);
        }
      }

      // Toggle lightbox for selected image: Space bar
      if (
        (event.key === 'Enter' || event.key === ' ') &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();

        if (isOpen) {
          // If lightbox is open, close it
          closeLightbox();
        } else if (selection.selectedIds.size > 0) {
          // If lightbox is closed and we have selections, open lightbox for the selected image
          const mediaId =
            selection.lastSelectedId || Array.from(selection.selectedIds)[0];
          openLightbox(mediaId);
        }
      }

      // Hide selected: H key (only when lightbox is closed)
      if (event.key === 'h' && !event.ctrlKey && !event.metaKey && !isOpen) {
        event.preventDefault();
        toggleHideSelected();
      }

      // Delete selected: Delete key or D key (only when lightbox is closed)
      if (
        !isOpen &&
        (event.key === 'Delete' ||
          event.key === 'Backspace' ||
          (event.key === 'd' && !event.ctrlKey && !event.metaKey))
      ) {
        event.preventDefault();
        toggleDeleteSelected();
      }
    },
    [
      selectAll,
      toggleHideSelected,
      toggleDeleteSelected,
      selection,
      openLightbox,
      closeLightbox,
      isOpen,
      navigateSelection,
      columns,
      media,
    ],
  );

  useEffect(() => {
    // Add global keyboard event listener
    window.addEventListener('keydown', handleKeyDown);

    // Clean up the event listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return <>{children}</>;
}

export function MediaListContainer({ media }: MediaListContainerProps) {
  const windowWidth = useWindowWidth();

  // Determine number of columns based on window width
  const columns = useMemo(() => {
    if (windowWidth >= 1920) return 8;
    if (windowWidth >= 1536) return 7;
    if (windowWidth >= 1280) return 6;
    if (windowWidth >= 1024) return 5;
    if (windowWidth >= 768) return 4;
    if (windowWidth >= 640) return 3;
    if (windowWidth >= 468) return 2;
    if (windowWidth >= 320) return 1;
    return 1;
  }, [windowWidth]);

  return (
    <MediaSelectionProvider media={media}>
      <MediaKeyboardHandler columns={columns} media={media}>
        <ScrollArea className="h-full">
          <MediaGrid media={media} columns={columns} />
        </ScrollArea>
        <MediaSelectionActions />
      </MediaKeyboardHandler>
    </MediaSelectionProvider>
  );
}

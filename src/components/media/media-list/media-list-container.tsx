'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MediaWithRelations } from '@/types/media-types';
import { MediaDetail } from '../media-detail/media-detail';
import { MediaGrid } from './media-grid';
import {
  MediaSelectionProvider,
  useMediaSelection,
} from './media-selection-context';

interface MediaListContainerProps {
  media: MediaWithRelations[];
  totalCount: number;
}

// Inner component to handle keyboard events
function MediaKeyboardHandler({ children }: { children: React.ReactNode }) {
  const { selectAll, toggleHideSelected, toggleDeleteSelected } =
    useMediaSelection();

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

      // Hide selected: H key
      if (event.key === 'h' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        toggleHideSelected();
      }

      // Delete selected: Delete key or D key
      if (
        event.key === 'Delete' ||
        event.key === 'Backspace' ||
        (event.key === 'd' && !event.ctrlKey && !event.metaKey)
      ) {
        event.preventDefault();
        toggleDeleteSelected();
      }
    },
    [selectAll, toggleHideSelected, toggleDeleteSelected],
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
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <MediaSelectionProvider media={media}>
      <MediaKeyboardHandler>
        <Card className="grid grid-cols-[1fr_auto] h-full overflow-hidden">
          <ScrollArea className="p-4 h-full">
            <MediaGrid media={media} />
          </ScrollArea>

          {detailOpen && (
            <div className="w-[450px] border-l border-gray-200 dark:border-gray-800">
              <MediaDetail onClose={() => setDetailOpen(false)} />
            </div>
          )}
        </Card>
      </MediaKeyboardHandler>
    </MediaSelectionProvider>
  );
}

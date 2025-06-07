'use client';

import {
  toggleMediaDeleted,
  toggleMediaHidden,
} from '@/actions/media/toggle-media-status';
import {
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';
import type {
  Media,
  MediaSelectionState,
  MediaWithRelations,
} from 'shared/types';

interface MediaSelectionContextProps {
  selection: MediaSelectionState;
  media: Media[];
  toggleSelection: (
    id: string,
    multiSelect?: boolean,
    rangeSelect?: boolean,
  ) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  toggleHideSelected: () => void;
  toggleDeleteSelected: () => void;
  selectedMedia: MediaWithRelations[];
  navigateSelection: (
    direction: 'up' | 'down' | 'left' | 'right',
    columns: number,
  ) => void;
}

const MediaSelectionContext = createContext<
  MediaSelectionContextProps | undefined
>(undefined);

export function MediaSelectionProvider({
  children,
  media,
}: {
  children: ReactNode;
  media: MediaWithRelations[];
}) {
  const [selection, setSelection] = useState<MediaSelectionState>({
    selectedIds: new Set<string>(),
    lastSelectedId: null,
  });

  const toggleSelection = (
    id: string,
    multiSelect = false,
    rangeSelect = false,
  ) => {
    setSelection((prev) => {
      // Clone the current selection state
      const newSelectedIds = new Set(prev.selectedIds);

      if (rangeSelect && prev.lastSelectedId) {
        // Handle range selection (Shift+Click)
        const lastIndex = media.findIndex(
          (file) => file.id === prev.lastSelectedId,
        );
        const currentIndex = media.findIndex((file) => file.id === id);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);

          for (let i = start; i <= end; i++) {
            newSelectedIds.add(media[i].id);
          }
        }
      } else if (multiSelect) {
        // Handle multi-selection (Ctrl/Cmd+Click)
        if (newSelectedIds.has(id)) {
          newSelectedIds.delete(id);
        } else {
          newSelectedIds.add(id);
        }
      } else {
        // Handle single selection (regular click)
        // Always select the clicked item, don't toggle it
        newSelectedIds.clear();
        newSelectedIds.add(id);
      }

      return {
        selectedIds: newSelectedIds,
        lastSelectedId: id,
      };
    });
  };

  const selectAll = () => {
    setSelection({
      selectedIds: new Set(media.map((file) => file.id)),
      lastSelectedId: null,
    });
  };

  const clearSelection = () => {
    setSelection({
      selectedIds: new Set(),
      lastSelectedId: null,
    });
  };

  const isSelected = (id: string) => {
    return selection.selectedIds.has(id);
  };

  const toggleHideSelected = async () => {
    if (selection.selectedIds.size === 0) return;

    const mediaIds = Array.from(selection.selectedIds);
    const result = await toggleMediaHidden(mediaIds);

    if (result.success) {
      console.log('Successfully toggled hide status for files:', mediaIds);
      // Clear selection after successful action
      clearSelection();
    } else {
      console.error('Failed to toggle hide status:', result.error);
    }
  };

  const toggleDeleteSelected = async () => {
    if (selection.selectedIds.size === 0) return;

    const mediaIds = Array.from(selection.selectedIds);
    const result = await toggleMediaDeleted(mediaIds);

    if (result.success) {
      console.log('Successfully toggled delete status for files:', mediaIds);
      // Clear selection after successful action
      clearSelection();
    } else {
      console.error('Failed to toggle delete status:', result.error);
    }
  };

  const selectedMedia = useMemo(() => {
    return media.filter((file) => selection.selectedIds.has(file.id));
  }, [media, selection.selectedIds]);

  const navigateSelection = (
    direction: 'up' | 'down' | 'left' | 'right',
    columns: number,
  ) => {
    if (media.length === 0) return;

    let targetIndex = 0;

    if (selection.lastSelectedId) {
      const currentIndex = media.findIndex(
        (file) => file.id === selection.lastSelectedId,
      );
      if (currentIndex === -1) return;

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
          targetIndex = Math.min(media.length - 1, currentIndex + columns);
          break;
      }
    } else if (selection.selectedIds.size === 0) {
      // If no selection, start with the first item
      targetIndex = 0;
    }

    if (targetIndex >= 0 && targetIndex < media.length) {
      const targetId = media[targetIndex].id;
      toggleSelection(targetId, false, false);
    }
  };

  const value = {
    selection,
    media,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    toggleHideSelected,
    toggleDeleteSelected,
    selectedMedia,
    navigateSelection,
  };

  return (
    <MediaSelectionContext.Provider value={value}>
      {children}
    </MediaSelectionContext.Provider>
  );
}

export function useMediaSelection() {
  const context = useContext(MediaSelectionContext);
  if (context === undefined) {
    throw new Error(
      'useMediaSelection must be used within a MediaSelectionProvider',
    );
  }
  return context;
}

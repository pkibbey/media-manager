'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import type {
  Media,
  MediaSelectionState,
  MediaWithRelations,
} from '@/types/media-types';

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
        if (newSelectedIds.size === 1 && newSelectedIds.has(id)) {
          // Clicking the only selected item deselects it
          newSelectedIds.clear();
        } else {
          // Select only this item
          newSelectedIds.clear();
          newSelectedIds.add(id);
        }
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
    // This would be implemented to call a server action
    // to toggle the is_hidden flag on selected files
    console.info('Toggle hide for files:', Array.from(selection.selectedIds));
  };

  const toggleDeleteSelected = async () => {
    // This would be implemented to call a server action
    // to toggle the is_deleted flag on selected files
    console.info('Toggle delete for files:', Array.from(selection.selectedIds));
  };

  const selectedMedia = useMemo(() => {
    return media.filter((file) => selection.selectedIds.has(file.id));
  }, [media, selection.selectedIds]);

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

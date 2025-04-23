import { createContext, useContext } from 'react';
import type { MediaItem } from '@/types/db-types';

// Context for handling selected media items
interface MediaSelectionContextType {
  selectedItemId: string | null;
  selectedItem: MediaItem | null;
  selectedItemIds: Set<string>;
  selectedItems: MediaItem[];
  selectItem: (
    item: MediaItem,
    multiSelect?: boolean,
    rangeSelect?: boolean,
    index?: number,
  ) => void;
  clearSelection: () => void;
  selectAll: () => void;
  isSelected: (itemId: string) => boolean;
}

// Create the context with default values
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

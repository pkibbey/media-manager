import { useEffect, useState } from 'react';
import type { MediaItem } from '@/types/db-types';

export function useMediaSelectionProvider(items: MediaItem[]) {
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaItem | null>(
    null,
  );
  const [selectedMediaItems, setSelectedMediaItems] = useState<MediaItem[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  );

  // Auto-select the first image when items are loaded and no item is currently selected
  useEffect(() => {
    if (
      items.length > 0 &&
      !selectedMediaItem &&
      selectedMediaItems.length === 0
    ) {
      setSelectedMediaItem(items[0]);
      setSelectedMediaItems([items[0]]);
      setLastSelectedIndex(0);
    }
  }, [items, selectedMediaItem, selectedMediaItems]);

  // Create a set of selected item IDs for faster lookups
  const selectedIds = new Set(selectedMediaItems.map((item) => item.id));

  const selectItem = (
    item: MediaItem,
    multiSelect = false,
    rangeSelect = false,
    index = -1,
  ) => {
    if (rangeSelect && lastSelectedIndex !== null && index !== -1) {
      // For range selection, select all items between lastSelectedIndex and current index
      const startIndex = Math.min(lastSelectedIndex, index);
      const endIndex = Math.max(lastSelectedIndex, index);

      // Get items in the range
      const itemsInRange = items.slice(startIndex, endIndex + 1);

      // Create a new selection that includes existing selections plus the range
      const newSelection = new Map<string, MediaItem>();

      // Add existing selections
      selectedMediaItems.forEach((item) => {
        newSelection.set(item.id, item);
      });

      // Add range items
      itemsInRange.forEach((item) => {
        newSelection.set(item.id, item);
      });

      // Convert back to array
      const newSelectionArray = Array.from(newSelection.values());

      setSelectedMediaItems(newSelectionArray);
      setSelectedMediaItem(item); // Make the clicked item the primary selection
    } else if (multiSelect) {
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

      if (index !== -1) {
        setLastSelectedIndex(index);
      }
    } else {
      // For single selection, clear previous selection and select only this item
      setSelectedMediaItem(item);
      setSelectedMediaItems([item]);

      if (index !== -1) {
        setLastSelectedIndex(index);
      }
    }
  };

  const clearSelection = () => {
    setSelectedMediaItem(null);
    setSelectedMediaItems([]);
    setLastSelectedIndex(null);
  };

  const selectAll = () => {
    setSelectedMediaItems([...items]);
    // Keep the last selected item as the primary selection or select the first item
    if (!selectedMediaItem && items.length > 0) {
      setSelectedMediaItem(items[0]);
    }
  };

  const isSelected = (itemId: string) => selectedIds.has(itemId);

  return {
    selectedItemId: selectedMediaItem?.id || null,
    selectedItem: selectedMediaItem,
    selectedItemIds: selectedIds,
    selectedItems: selectedMediaItems,
    selectItem,
    clearSelection,
    selectAll,
    isSelected,
  };
}

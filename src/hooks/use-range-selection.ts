import { useCallback, useRef, useState } from 'react';

interface UseRangeSelectionOptions<T> {
  items: T[];
  idExtractor: (item: T) => number; // Function to extract unique ID from an item
  onSelectionChange?: (selectedItems: Set<number>) => void; // Optional callback when selection changes
}

interface UseRangeSelectionResult {
  selectedItems: Set<number>;
  isSelectionMode: boolean;
  lastSelectedIndex: number | null;
  enterSelectionMode: (itemId: number, itemIndex: number) => void;
  exitSelectionMode: () => void;
  toggleSelection: (id: number, event?: React.MouseEvent) => void;
  selectRange: (startIndex: number, endIndex: number) => number;
  unselectRange: (startIndex: number, endIndex: number) => number;
  clearSelection: () => void;
  selectAll: () => void;
  handleItemClick: (item: any, index: number, event: React.MouseEvent) => void;
  handleItemMouseDown: (
    item: any,
    index: number,
    event: React.MouseEvent,
  ) => void;
  handleItemMouseUp: () => void;
  handleItemMouseLeave: () => void;
}

/**
 * A hook to manage complex range selection functionality, useful for media galleries,
 * file browsers, and other interfaces that require selecting multiple items.
 */
export function useRangeSelection<T>({
  items,
  idExtractor,
  onSelectionChange,
}: UseRangeSelectionOptions<T>): UseRangeSelectionResult {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const lastSelectedIndexRef = useRef<number | null>(null);

  // For long press detection
  const pressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  // Find the index of a specific item ID in the items array
  const findItemIndex = useCallback(
    (itemId: number): number => {
      return items.findIndex((item) => idExtractor(item) === itemId);
    },
    [items, idExtractor],
  );

  // Get a range of items between two indexes
  const getRangeOfItems = useCallback(
    (
      startIndex: number,
      endIndex: number,
    ): { range: number[]; start: number; end: number } => {
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);
      const range = [];
      for (let i = start; i <= end; i++) {
        if (i >= 0 && i < items.length) {
          // Push the item ID, not the entire item object
          range.push(idExtractor(items[i]));
        }
      }
      return { range, start, end };
    },
    [items, idExtractor],
  );

  // Select a range of items between two indexes
  const selectRange = useCallback(
    (startIndex: number, endIndex: number): number => {
      const { range, start, end } = getRangeOfItems(startIndex, endIndex);

      setSelectedItems((prevItems) => {
        // Create a new Set with all items from the previous selection
        const newSelection = new Set(prevItems);

        // Add each item ID from the range to the selection
        range.forEach((id) => newSelection.add(id));

        // Notify about selection change if callback provided
        if (onSelectionChange) {
          onSelectionChange(newSelection);
        }

        return newSelection;
      });

      // Update the last selected reference to the end index for future range selections
      lastSelectedIndexRef.current = endIndex;

      return range.length;
    },
    [getRangeOfItems, onSelectionChange],
  );

  // Unselect a range of items between two indexes
  const unselectRange = useCallback(
    (startIndex: number, endIndex: number): number => {
      const { range, start, end } = getRangeOfItems(startIndex, endIndex);

      setSelectedItems((prevItems) => {
        // Create a new Set with all items from the previous selection
        const newSelection = new Set(prevItems);

        // Remove each item ID from the range from the selection
        range.forEach((id) => newSelection.delete(id));

        // Notify about selection change if callback provided
        if (onSelectionChange) {
          onSelectionChange(newSelection);
        }

        return newSelection;
      });

      // Update the last selected reference to the end index for future range selections
      lastSelectedIndexRef.current = endIndex;

      return range.length;
    },
    [getRangeOfItems, onSelectionChange],
  );

  // Toggle selection of an item
  const toggleSelection = useCallback(
    (id: number, event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      setSelectedItems((prev) => {
        const newSelection = new Set(prev);
        if (newSelection.has(id)) {
          newSelection.delete(id);
        } else {
          newSelection.add(id);
        }

        // Notify about selection change if callback provided
        if (onSelectionChange) {
          onSelectionChange(newSelection);
        }

        return newSelection;
      });
    },
    [onSelectionChange],
  );

  // Enter selection mode and select the first item (no-op, always in selection mode)
  const enterSelectionMode = useCallback(
    (itemId: number, itemIndex: number) => {
      setSelectedItems(new Set([itemId]));
      lastSelectedIndexRef.current = itemIndex;
      if (onSelectionChange) {
        onSelectionChange(new Set([itemId]));
      }
    },
    [onSelectionChange],
  );

  // Exit selection mode and clear selection (just clear selection)
  const exitSelectionMode = useCallback(() => {
    setSelectedItems(new Set());
    lastSelectedIndexRef.current = null;
    if (onSelectionChange) {
      onSelectionChange(new Set());
    }
  }, [onSelectionChange]);

  // Clear all selections but stay in selection mode
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    lastSelectedIndexRef.current = null;

    // Notify about selection change if callback provided
    if (onSelectionChange) {
      onSelectionChange(new Set());
    }
  }, [onSelectionChange]);

  // Select all items
  const selectAll = useCallback(() => {
    const allIds = items.map((item) => idExtractor(item));
    setSelectedItems(new Set(allIds));

    // Notify about selection change if callback provided
    if (onSelectionChange) {
      onSelectionChange(new Set(allIds));
    }
  }, [items, idExtractor, onSelectionChange]);

  // Handle mouse events for items (including right-click to select)
  const handleItemMouseDown = useCallback(
    (item: any, index: number, event: React.MouseEvent) => {
      // Right click to enter selection mode
      if (event.button === 2) {
        // Right click
        event.preventDefault();
        toggleSelection(idExtractor(item));
        lastSelectedIndexRef.current = index;
        return;
      }

      // Handle long press
      if (event.button === 0) {
        // Left click
        setIsPressing(true);
        pressTimeoutRef.current = setTimeout(() => {
          toggleSelection(idExtractor(item));
          lastSelectedIndexRef.current = index;
        }, 500); // 500ms for long press
      }
    },
    [toggleSelection, idExtractor],
  );

  // Handle mouse up to clear long press timeout
  const handleItemMouseUp = useCallback(() => {
    setIsPressing(false);
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
      pressTimeoutRef.current = null;
    }
  }, []);

  // Clear timeout on mouse leave
  const handleItemMouseLeave = useCallback(() => {
    setIsPressing(false);
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
      pressTimeoutRef.current = null;
    }
  }, []);

  // Handle click on an item
  const handleItemClick = useCallback(
    (item: any, index: number, event: React.MouseEvent) => {
      const itemId = idExtractor(item);

      // Handle shift+ctrl/cmd+click for range unselection
      if (
        event.shiftKey &&
        (event.ctrlKey || event.metaKey) &&
        lastSelectedIndexRef.current !== null
      ) {
        event.preventDefault();

        unselectRange(lastSelectedIndexRef.current, index);
        return;
      }

      // Handle shift+click for range selection
      if (event.shiftKey && lastSelectedIndexRef.current !== null) {
        event.preventDefault();

        // Check if we're clicking on an already selected item in a range
        if (selectedItems.has(itemId)) {
          // Find indices for start and end of the range
          const currentRangeStart = Math.min(
            index,
            lastSelectedIndexRef.current,
          );
          const currentRangeEnd = Math.max(index, lastSelectedIndexRef.current);
          unselectRange(currentRangeStart, currentRangeEnd);
          return;
        }

        selectRange(lastSelectedIndexRef.current, index);
        return;
      }

      // If shift is pressed but no last selected, just select this item
      if (event.shiftKey && lastSelectedIndexRef.current === null) {
        setSelectedItems(new Set([itemId]));
        lastSelectedIndexRef.current = index;
        if (onSelectionChange) {
          onSelectionChange(new Set([itemId]));
        }
        return;
      }

      // If a modifier key is pressed (Ctrl/Cmd), toggle selection
      if (event.ctrlKey || event.metaKey) {
        toggleSelection(itemId);
        lastSelectedIndexRef.current = index;
        return;
      }

      // Default: toggle selection and update last selected
      toggleSelection(itemId);
      lastSelectedIndexRef.current = index;
      return;
    },
    [
      toggleSelection,
      selectRange,
      unselectRange,
      idExtractor,
      selectedItems,
      onSelectionChange,
    ],
  );

  return {
    selectedItems,
    isSelectionMode: true,
    lastSelectedIndex: lastSelectedIndexRef.current,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    selectRange,
    unselectRange,
    clearSelection,
    selectAll,
    handleItemClick,
    handleItemMouseDown,
    handleItemMouseUp,
    handleItemMouseLeave,
  };
}

export default useRangeSelection;

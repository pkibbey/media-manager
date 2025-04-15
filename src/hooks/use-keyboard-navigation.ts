import { getKeyboardNavigationIndex } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function useKeyboardNavigation(
  itemsLength: number,
  columnsCount = 4,
  onSelect?: (index: number) => void,
) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  // Handle keyboard navigation
  useEffect(() => {
    if (!itemsLength) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle navigation keys
      const navigationKeys = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
        'Enter',
        ' ', // Space
        'PageUp',
        'PageDown',
      ];

      if (!navigationKeys.includes(event.key)) {
        return;
      }

      // Start navigation mode if not already active
      if (focusedIndex === -1 && navigationKeys.includes(event.key)) {
        setFocusedIndex(0);
        setIsNavigating(true);
        event.preventDefault();
        return;
      }

      // Handle selection keys
      if ((event.key === 'Enter' || event.key === ' ') && focusedIndex !== -1) {
        event.preventDefault();
        onSelect?.(focusedIndex);
        return;
      }

      // Handle page navigation (move by "page" of items - a full grid of rows)
      if (event.key === 'PageUp' || event.key === 'PageDown') {
        event.preventDefault();

        // Calculate how many rows should be in a "page"
        const rowsPerPage = Math.floor(window.innerHeight / 200); // Approximate height of a grid item with spacing
        const itemsPerPage = rowsPerPage * columnsCount;

        if (event.key === 'PageUp') {
          setFocusedIndex((prev) => Math.max(0, prev - itemsPerPage));
        } else {
          setFocusedIndex((prev) =>
            Math.min(itemsLength - 1, prev + itemsPerPage),
          );
        }

        // Ensure the new index is visible
        setTimeout(() => {
          scrollItemIntoView(focusedIndex);
        }, 0);

        setIsNavigating(true);
        return;
      }

      // Handle navigation keys
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Home',
          'End',
        ].includes(event.key)
      ) {
        event.preventDefault();

        const newIndex = getKeyboardNavigationIndex(
          focusedIndex,
          event.key,
          itemsLength,
          columnsCount,
        );

        setFocusedIndex(newIndex);
        scrollItemIntoView(newIndex);
        setIsNavigating(true);
      }
    };

    const handleMouseMove = () => {
      // Exit keyboard navigation mode when moving the mouse
      if (isNavigating) {
        setIsNavigating(false);
      }
    };

    // Scroll the focused element into view
    const scrollItemIntoView = (index: number) => {
      const element = document.querySelector(`[data-index="${index}"]`);
      if (element) {
        element.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
          behavior: 'smooth',
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [focusedIndex, itemsLength, columnsCount, isNavigating, onSelect]);

  return {
    focusedIndex,
    isNavigating,
    setFocusedIndex,
  };
}

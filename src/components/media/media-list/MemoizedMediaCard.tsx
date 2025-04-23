import { memo } from 'react';
import type { MediaItem } from '@/types/db-types';
import MediaCard from '../media-card';
import { useMediaSelection } from './MediaSelectionContext';

// Memoized version of MediaCard that only re-renders when necessary
export const MemoizedMediaCard = memo(
  function MemoizedMediaCard({
    item,
    index,
  }: {
    item: MediaItem;
    index: number;
  }) {
    const { selectItem, isSelected } = useMediaSelection();

    return (
      <MediaCard
        item={item}
        index={index}
        isSelected={isSelected(item.id)}
        onClick={(e) => {
          // Use Shift + Click for range selection
          const rangeSelect = e.shiftKey;
          // Use Ctrl/Cmd + Click for toggling individual items
          const multiSelect = (e.ctrlKey || e.metaKey) && !rangeSelect;

          selectItem(item, multiSelect, rangeSelect, index);
        }}
      />
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if the item ID changes
    return prevProps.item.id === nextProps.item.id;
  },
);

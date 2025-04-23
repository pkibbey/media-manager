import { useRef } from 'react';
import type { MediaItem } from '@/types/db-types';
import { useMediaSelection } from './MediaSelectionContext';
import { MemoizedMediaCard } from './MemoizedMediaCard';

type MediaGridProps = {
  items: MediaItem[];
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
};

export function MediaGrid({ items, onKeyDown }: MediaGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const { selectedItems } = useMediaSelection();

  return (
    <div className="flex flex-col space-y-6">
      {selectedItems.length > 1 && (
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm">
            <span className="text-primary">
              {selectedItems.length} items selected
            </span>
          </div>
        </div>
      )}
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-max content-start"
        ref={gridRef}
        role="grid"
        aria-label="Media items grid"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((item, index) => (
          <MemoizedMediaCard key={item.id} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}

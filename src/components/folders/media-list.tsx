'use client';
import type { MediaItem } from '@/types';
import { MixerHorizontalIcon } from '@radix-ui/react-icons';
import { useRef, useState } from 'react';
import MediaDetail from '../media/media-detail';
import MediaCard from './media-card';

interface MediaListProps {
  items: MediaItem[];
}

export default function MediaList({ items }: MediaListProps) {
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaItem | null>(
    null,
  );
  const gridRef = useRef<HTMLDivElement>(null);

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <MixerHorizontalIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No media found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or browsing another folder.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-4">
      <div
        className={
          'select-none grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 transition-all duration-300'
        }
        ref={gridRef}
        role="grid"
        aria-label="Media items grid"
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((item, index) => (
          <MediaCard
            key={item.id}
            item={item}
            index={index}
            onClick={(e) => {
              setSelectedMediaItem(item);
            }}
          />
        ))}
      </div>
      <MediaDetail item={selectedMediaItem} />
    </div>
  );
}

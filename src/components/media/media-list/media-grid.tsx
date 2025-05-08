'use client';

import { useMemo } from 'react';
import useWindowWidth from '@/hooks/useWindowWidth';
import type { MediaWithRelations } from '@/types/media-types';
import { MediaCard } from './media-card';

interface MediaGridProps {
  media: MediaWithRelations[];
}

export function MediaGrid({ media }: MediaGridProps) {
  const windowWidth = useWindowWidth();

  // Determine number of columns based on window width
  const columns = useMemo(() => {
    if (windowWidth >= 1920) return 6;
    if (windowWidth >= 1536) return 5;
    if (windowWidth >= 1280) return 4;
    if (windowWidth >= 1024) return 3;
    if (windowWidth >= 768) return 2;
    return 1;
  }, [windowWidth]);

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {media.map((item) => (
        <MediaCard key={item.id} media={item} />
      ))}

      {media.length === 0 && (
        <div className="col-span-full p-8 text-center text-muted-foreground">
          No media found that match your search criteria.
        </div>
      )}
    </div>
  );
}

'use client';

import type { MediaWithRelations } from 'shared/types';
import { MediaCard } from './media-card';

interface MediaGridProps {
  media: MediaWithRelations[];
  columns: number;
}

export function MediaGrid({ media, columns }: MediaGridProps) {
  return (
    <div
      className="container mx-auto px-6 py-4 grid gap-2"
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

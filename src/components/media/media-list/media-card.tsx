'use client';

import Image from 'next/image';
import type React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { formatBytes } from '@/lib/consts';
import { cn } from '@/lib/utils';
import type { MediaWithRelations } from '@/types/media-types';
import { useMediaSelection } from './media-selection-context';

interface MediaCardProps {
  media: MediaWithRelations;
}

export function MediaCard({ media }: MediaCardProps) {
  const { toggleSelection, isSelected } = useMediaSelection();
  const selected = isSelected(media.id);

  const handleClick = (e: React.MouseEvent) => {
    const multiSelect = e.ctrlKey || e.metaKey;
    const rangeSelect = e.shiftKey;
    toggleSelection(media.id, multiSelect, rangeSelect);
  };

  // Extract just the filename from the path
  const fileName = media.media_path.split('/').pop() || media.media_path;

  return (
    <Card
      className={cn(
        'group overflow-hidden relative cursor-pointer transition-all',
        selected
          ? 'border-primary ring-2 ring-primary ring-opacity-25'
          : 'hover:border-accent-foreground/20',
        media.is_hidden ? 'opacity-60' : '',
        media.is_deleted ? 'opacity-50 bg-destructive/5' : '',
      )}
      onClick={handleClick}
    >
      {/* Thumbnail image */}
      <div className="aspect-square overflow-hidden bg-muted relative">
        {media.thumbnails.length ? (
          <Image
            src={media.thumbnails[0].thumbnail_url}
            alt={fileName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {media.media_type.type_name.toUpperCase()}
          </div>
        )}

        {/* Selection checkbox overlay */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Checkbox checked={selected} className="bg-background/80" />
        </div>
      </div>

      {/* Media information */}
      <CardFooter className="p-2 flex flex-col items-start">
        <div className="text-sm font-medium truncate w-full">{fileName}</div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {media.media_type.type_name}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatBytes(media.size_bytes)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}

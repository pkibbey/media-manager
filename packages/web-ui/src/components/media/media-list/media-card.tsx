'use client';
import { Card, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type React from 'react';
import { formatBytes } from 'shared/consts';
import type { MediaWithRelations } from 'shared/types';
import { useMediaSelection } from './media-selection-context';

interface MediaCardProps {
  media: MediaWithRelations;
  showFooter?: boolean;
}

export function MediaCard({ media, showFooter = false }: MediaCardProps) {
  const { toggleSelection, isSelected } = useMediaSelection();
  const selected = isSelected(media.id);

  const handleClick = (e: React.MouseEvent) => {
    // If clicking on the checkbox area, handle selection
    if ((e.target as HTMLElement).closest('[data-selection-checkbox]')) {
      const multiSelect = e.ctrlKey || e.metaKey;
      const rangeSelect = e.shiftKey;
      toggleSelection(media.id, multiSelect, rangeSelect);
      return;
    }

    // Always handle selection on click
    const multiSelect = e.ctrlKey || e.metaKey;
    const rangeSelect = e.shiftKey;
    toggleSelection(media.id, multiSelect, rangeSelect);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const multiSelect = e.ctrlKey || e.metaKey;
    const rangeSelect = e.shiftKey;
    toggleSelection(media.id, multiSelect, rangeSelect);
  };

  const fileName = media.media_path.split('/').pop() || media.media_path;

  return (
    <Card
      className={cn(
        'group overflow-hidden relative cursor-pointer transition-all p-0 bg-transparent rounded-sm focus-visible:outline-none',
        selected
          ? 'border-primary ring-2 ring-primary ring-opacity-50'
          : 'hover:border-accent-foreground/20',
        media?.is_hidden ? 'opacity-60' : '',
        media.is_deleted ? 'opacity-50 bg-destructive/5' : '',
      )}
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
    >
      {/* Thumbnail image */}
      <div className="aspect-square overflow-hidden bg-muted relative">
        {media.thumbnail_url && media.exif_data ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Image
              src={media.thumbnail_url}
              alt={fileName}
              className="w-full h-full object-cover"
              loading="lazy"
              width={media.exif_data.width || 400}
              height={media.exif_data.height || 400}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No Preview
          </div>
        )}

        {/* Selection checkbox overlay */}
        <div
          className={cn(
            'absolute top-2 left-2 transition-opacity z-10',
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          data-selection-checkbox
        >
          <Checkbox
            checked={selected}
            className="bg-background/80"
            onClick={handleCheckboxClick}
          />
        </div>
      </div>

      {/* Media information */}
      {showFooter && (
        <CardFooter className="p-2 flex flex-col items-start">
          <div className="text-sm font-medium truncate w-full">{fileName}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatBytes(media.size_bytes)}
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

'use client';

import { bytesToSize } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import MediaThumbnail from './media-thumbnail';

interface MediaCardProps {
  item: MediaItem;
  index: number;
  isSelected?: boolean;
  onClick: (e: React.MouseEvent | React.KeyboardEvent) => void;
}

export default function MediaCard({
  item,
  index,
  isSelected = false,
  onClick,
}: MediaCardProps) {
  // Get folder name for display in subfolder mode
  const folderName = item.folder_path.split('/').filter(Boolean).pop();

  return (
    <div
      className={`group relative bg-muted rounded-md overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'ring-1 ring-primary ring-offset-1' : ''
      }`}
      onClick={onClick}
      onKeyDown={(e) => {
        // Handle keyboard navigation
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View ${item.file_name}`}
      data-index={index}
      aria-selected={isSelected}
    >
      <div className="aspect-square relative">
        <MediaThumbnail item={item} priority={index < 6} />

        {/* Folder indicator - only shown if folderName exists */}
        {folderName && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs rounded px-1 py-0.5 max-w-[80%] truncate opacity-70">
            {folderName}
          </div>
        )}
      </div>

      <div className="p-2 text-xs">
        <div className="truncate font-medium" title={item.file_name}>
          {item.file_name}
        </div>
        <div className="text-muted-foreground">
          {bytesToSize(item.size_bytes || 0)}
        </div>
      </div>
    </div>
  );
}

'use client';

import { bytesToSize } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import MediaPreview from './media-preview';

interface MediaCardProps {
  item: MediaItem;
  index: number;
  onClick: (e: React.MouseEvent | React.KeyboardEvent) => void;
}

export default function MediaCard({ item, index, onClick }: MediaCardProps) {
  // Show a visual indicator for processed items
  const isProcessed = item.processed;

  // Get folder name for display in subfolder mode
  const folderName = item.folder_path.split('/').filter(Boolean).pop();

  return (
    <div
      className="group relative bg-muted rounded-md overflow-hidden cursor-pointer transition-all"
      onClick={onClick}
      onKeyDown={onClick}
      tabIndex={0}
      role="button"
      aria-label={`View ${item.file_name}`}
      data-index={index}
    >
      <div className="aspect-square relative">
        <MediaPreview item={item} />
        {/* Thumbnail indicator */}
        {item.thumbnail_path && (
          <div
            className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-purple-500"
            title="Using pre-generated thumbnail"
          />
        )}

        {/* ExifData indicators */}
        <div className="absolute top-2 right-2 flex gap-1">
          {isProcessed && (
            <div
              className="h-2 w-2 rounded-full bg-green-500"
              title="ExifData processed"
            />
          )}
          {item.exif_data && (
            <div
              className="h-2 w-2 rounded-full bg-blue-500"
              title="Location data available"
            />
          )}
        </div>

        {/* Folder indicator - only shown if folderName exists */}
        {folderName && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs rounded px-1 py-0.5 max-w-[80%] truncate">
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

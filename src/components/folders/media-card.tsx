'use client';

import { bytesToSize, guessFileCategory } from '@/lib/utils';
import type { MediaItem } from '@/types';
import { FileIcon, VideoIcon } from 'lucide-react';
import Image from 'next/image';

interface MediaCardProps {
  item: MediaItem;
  index: number;
  onClick: (e: React.MouseEvent | React.KeyboardEvent) => void;
}

export default function MediaCard({ item, index, onClick }: MediaCardProps) {
  const type = guessFileCategory(item.extension);
  const isImage = type === 'image';
  const isVideo = type === 'video';
  const fileExtension = item.file_name.split('.').pop()?.toLowerCase();

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
        {isImage && item.thumbnail_path ? (
          <div className="w-full h-full relative">
            <Image
              src={item.thumbnail_path}
              alt={item.file_name}
              fill
              className="object-cover"
            />
          </div>
        ) : isVideo ? (
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            <VideoIcon className="h-12 w-12 text-white opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs rounded px-1 py-0.5">
              VIDEO
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center">
              <FileIcon className="h-10 w-10 text-muted-foreground" />
              <span className="text-xs font-medium mt-2">
                {fileExtension ? `.${fileExtension.toUpperCase()}` : 'FILE'}
              </span>
            </div>
          </div>
        )}

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

'use client';

import { isImage, isSkippedLargeFile, isVideo } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import { FileIcon, VideoIcon } from 'lucide-react';
import Image from 'next/image';

interface MediaPreviewProps {
  item: MediaItem;
  isNativelySupported?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
}

export default function MediaPreview({
  item,
  fill = false,
  width,
  height,
}: MediaPreviewProps) {
  const isImageFile = isImage(item.extension);
  const isVideoFile = isVideo(item.extension);
  const fileExtension = item.extension?.toLowerCase();

  return (
    <>
      {isImageFile &&
      (item.thumbnail_path || item.file_path) &&
      !isSkippedLargeFile(item.file_path, item.size_bytes) ? (
        <div className="w-full h-full relative">
          <Image
            src={`/api/media?id=${item.id}`}
            alt={item.file_name}
            className="object-cover"
            fill={fill}
            width={width}
            height={height}
            unoptimized
            loading="lazy"
            placeholder="empty"
            onError={(e) => {
              // Fallback for failed thumbnails
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.style.display = 'none';
              // Force parent to show fallback
              if (target.parentElement) {
                target.parentElement.classList.add('thumbnail-error');
              }
            }}
          />
        </div>
      ) : isVideoFile ? (
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
            <span className="text-xs font-medium mt-2 uppercase">
              {fileExtension || 'FILE'}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

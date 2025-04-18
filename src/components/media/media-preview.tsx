'use client';

import { isImage, isSkippedLargeFile, isVideo } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import { FileIcon, VideoIcon } from 'lucide-react';
import Image from 'next/image';
import { memo, useEffect, useState } from 'react';

interface MediaPreviewProps {
  item: MediaItem;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  zoomMode?: boolean;
}

// Use React.memo to prevent unnecessary re-renders when parent components update
const MediaPreview = memo(
  function MediaPreview({
    item,
    fill = false,
    width,
    height,
    className = '',
    zoomMode = false,
  }: MediaPreviewProps) {
    const [orientation, setOrientation] = useState<number | null>(null);
    const extension = item.extension?.toLowerCase();
    const isImg = isImage(extension);
    const isVid = isVideo(extension);

    // Get image orientation from EXIF data
    useEffect(() => {
      if (isImg && item.exif_data) {
        try {
          const exifData = item.exif_data as any;
          const orientation = exifData?.Image?.Orientation || null;
          setOrientation(orientation);
        } catch (e) {
          console.error('Error reading EXIF orientation:', e);
        }
      }
    }, [isImg, item.exif_data]);

    // Determine if image is rotated 90/270 degrees based on EXIF
    const isRotated = orientation === 6 || orientation === 8;

    // Apply special class for rotated images in zoom mode
    const containerClass = zoomMode && isRotated ? 'rotated-image' : '';

    return (
      <>
        {isImg &&
        (item.thumbnail_path || item.file_path) &&
        !isSkippedLargeFile(item.file_path, item.size_bytes) ? (
          <div className={`w-full h-full relative ${containerClass}`}>
            <Image
              src={
                item.thumbnail_path
                  ? item.thumbnail_path
                  : `/api/media?id=${item.id}`
              }
              unoptimized={fill}
              alt={item.file_name}
              className={`${fill ? 'object-cover' : 'max-w-full h-auto'} ${className}`}
              fill={fill}
              sizes={
                fill
                  ? '(max-width: 768px) 100vw, (min-width: 769px) 50vw'
                  : undefined
              }
              width={width}
              height={height}
              loading="lazy"
              placeholder="empty"
              // Remove 'unoptimized' to enable Next.js image caching
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
        ) : isVid ? (
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
                {extension || 'FILE'}
              </span>
            </div>
          </div>
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memoization
    // Only re-render if the item ID changes
    return prevProps.item.id === nextProps.item.id;
  },
);

export default MediaPreview;

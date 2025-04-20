'use client';

import useWindowWidth from '@/hooks/useWindowWidth';
import { fileTypeCache } from '@/lib/file-type-cache';
import { isSkippedLargeFile } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import type { Exif } from 'exif-reader';
import { FileIcon, VideoIcon } from 'lucide-react';
import Image from 'next/image';
import { memo, useEffect, useState } from 'react';

interface MediaFullViewProps {
  item: MediaItem;
  className?: string;
  zoomMode?: boolean;
}

function calculateAspectRatio(exifData: Exif | null): {
  width: number;
  height: number;
} {
  if (!exifData) {
    return { width: 0, height: 0 };
  }

  // Try to get dimensions from Image tags
  const width = exifData.Image?.ImageWidth || 0;
  const height = exifData.Image?.ImageLength || 0;

  // Fallback to Photo tags if Image tags are not available
  if (width === 0 && height === 0) {
    return {
      width: exifData.Photo?.PixelXDimension || 0,
      height: exifData.Photo?.PixelYDimension || 0,
    };
  }

  return { width, height };
}

// Optimized component for full-size media view in detail panel
const MediaFullView = memo(
  function MediaFullView({
    item,
    className = '',
    zoomMode = false,
  }: MediaFullViewProps) {
    const windowWidth = useWindowWidth();
    const fileTypeId = item.file_type_id;
    const exifData = item.exif_data as Exif | null;
    const orientation = exifData?.Image?.Orientation || undefined;
    const { height, width } = calculateAspectRatio(exifData);
    const aspectRatio = width / height;

    // Track media type state
    const [isImg, setIsImg] = useState(false);
    const [isVid, setIsVid] = useState(false);
    const [category, setCategory] = useState<string | null>(null);

    // Use effect to determine media type using fileTypeId when available
    useEffect(() => {
      const checkMediaType = async () => {
        // Use file_type_id if available, otherwise fall back to extension
        if (fileTypeId) {
          // Get media type from file_type_id (preferred approach)
          setIsImg(await fileTypeCache.isImageById(fileTypeId));
          setIsVid(await fileTypeCache.isVideoById(fileTypeId));
          const fileType = await fileTypeCache.getFileTypeById(fileTypeId);
          setCategory(fileType?.category || null);
        }
      };

      checkMediaType();
    }, [fileTypeId]);

    // Determine if image is rotated 90/270 degrees based on EXIF
    const isRotated = orientation === 6 || orientation === 8;

    // Apply special class for rotated images in zoom mode
    const containerClass = zoomMode && isRotated ? 'rotated-image' : '';

    return (
      <>
        {isImg &&
        item.file_path &&
        !isSkippedLargeFile(item.size_bytes || 0) ? (
          <div
            className={`w-[${windowWidth}px] h-[${Math.round(windowWidth / aspectRatio)}px] relative ${containerClass}`}
          >
            <Image
              src={`/api/media?id=${item.id}`}
              unoptimized={true}
              alt={item.file_name}
              width={width}
              height={height}
              className={`object-contain ${className}`}
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={true}
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
        ) : isVid ? (
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            <VideoIcon className="h-16 w-16 text-white opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="absolute bottom-4 right-4 bg-black/60 text-white text-sm rounded px-2 py-1">
              VIDEO
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center">
              <FileIcon className="h-16 w-16 text-muted-foreground" />
              <span className="text-sm font-medium mt-3 uppercase">
                {category || 'FILE'}
              </span>
            </div>
          </div>
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if the item ID changes or zoom mode changes
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.zoomMode === nextProps.zoomMode
    );
  },
);

export default MediaFullView;

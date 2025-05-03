'use client';

import type { Tags } from 'exifreader';
import { FileIcon, VideoIcon } from 'lucide-react';
import Image from 'next/image';
import { memo } from 'react';
import useWindowWidth from '@/hooks/useWindowWidth';
import type { MediaItem } from '@/types/db-types';

interface MediaFullViewProps {
  item: MediaItem;
  className?: string;
  zoomMode?: boolean;
}

function calculateAspectRatio(exifData: Tags | null): {
  width: number;
  height: number;
} {
  if (!exifData) {
    return { width: 0, height: 0 };
  }

  // Try to get dimensions from Image tags
  const width = Number(exifData.ImageWidth) || 0;
  const height = Number(exifData.ImageHeight) || 0;

  // Fallback to Photo tags if Image tags are not available
  if (width === 0 && height === 0) {
    return {
      width: Number(exifData.PixelXDimension) || 0,
      height: Number(exifData.PixelYDimension) || 0,
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
    const exifData = item.exif_data as Tags | null;
    const orientation = exifData?.Orientation || undefined;
    const { height, width } = calculateAspectRatio(exifData);
    const aspectRatio = width / height;

    // Determine if image is rotated 90/270 degrees based on EXIF
    const isRotated =
      orientation?.description === 'Rotate 90 CW' ||
      orientation?.description === 'Rotate 270 CW';

    // A check for flipped images (180 degrees)
    const isFlipped =
      orientation?.description === 'Downwards' ||
      orientation?.description === 'Upwards';
    if (isFlipped) console.log('isFlipped: ', isFlipped);

    // Apply special class for rotated images in zoom mode
    const containerClass = zoomMode && isRotated ? 'rotated-image' : '';

    const category = item.file_types?.category || 'file';
    const isImg = category === 'image';
    const isVid = category === 'video';

    return (
      <>
        {isImg && item.file_path ? (
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
                {category}
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

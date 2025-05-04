'use client';

import type { Tags } from 'exifreader';
import { FileIcon } from 'lucide-react';
import Image from 'next/image';
import { memo } from 'react';
import useWindowWidth from '@/hooks/useWindowWidth';
import type { MediaItem } from '@/types/db-types';

interface MediaFullViewProps {
  item: MediaItem;
  zoomMode: boolean;
  toggleZoomMode: () => void;
  category: string | null;
  exifData: Tags | null;
  className?: string;
}

function calculateAspectRatio(exifData: Tags | null): {
  width: number;
  height: number;
} {
  if (!exifData) {
    return { width: 900, height: 1440 };
  }

  // Try to get dimensions from Image tags
  const width = exifData['Image Width']?.value || 900;
  const height = exifData['Image Height']?.value || 1440;

  // Fallback to Photo tags if Image tags are not available
  if (width === 0 && height === 0) {
    return {
      width: Number(exifData.PixelXDimension?.value) || 900,
      height: Number(exifData.PixelYDimension?.value) || 1440,
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
    toggleZoomMode,
    category,
    exifData,
  }: MediaFullViewProps) {
    const windowWidth = useWindowWidth();
    const orientation = exifData?.Orientation || undefined;
    const { height, width } = calculateAspectRatio(exifData);
    const aspectRatio = width / height;
    console.log('aspectRatio: ', aspectRatio)

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

    const isImg = category === 'image';
    const isVid = category === 'video';

    return (
      <>
        {isImg && item.file_path ? (
          <div
            className={`w-[${windowWidth}px] h-[${Math.round(windowWidth / aspectRatio)}px] relative ${containerClass}`}
            key={`full-image-${item.id}`} // Add unique key to force re-rendering
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
                target.onerror = null; // Prevent infinite error loops
                
                // Show fallback content inside the container instead of hiding the image
                if (target.parentElement) {
                  // Create fallback element
                  const fallback = document.createElement('div');
                  fallback.className = 'flex flex-col items-center justify-center w-full h-full bg-muted/20';
                  fallback.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span class="text-sm text-muted-foreground mt-2">Image failed to load</span>
                  `;
                  
                  // Replace the image with the fallback
                  target.style.display = 'none';
                  target.parentElement.appendChild(fallback);
                }
              }}
            />
          </div>
        ) : isVid ? (
          <div
            className={`w-[${windowWidth}px] h-[${Math.round((windowWidth / 16) * 9)}px] relative ${containerClass}`}
            key={`full-video-${item.id}`} // Add unique key to force re-rendering
          >
            <video
              src={`/api/media?id=${item.id}`}
              className="w-full h-full object-cover"
              loop
              playsInline
              controls
            />
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

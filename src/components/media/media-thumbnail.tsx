'use client';

import { FileIcon, VideoIcon } from 'lucide-react';
import Image from 'next/image';
import { memo, useEffect, useState } from 'react';
import { fileTypeCache } from '@/lib/file-type-cache';
import type { MediaItem } from '@/types/db-types';

interface MediaThumbnailProps {
  item: MediaItem;
  priority?: boolean;
  className?: string;
}

// Optimized component for small card thumbnails
const MediaThumbnail = memo(
  function MediaThumbnail({
    item,
    priority = false,
    className = '',
  }: MediaThumbnailProps) {
    const fileTypeId = item.file_type_id;

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

    // Use the dedicated thumbnail_path field from the media_item
    const thumbnailPath = item.thumbnail_path;

    return (
      <>
        {isImg && thumbnailPath ? (
          <div className="w-full h-full relative" key={`thumb-${item.id}`}>
            <Image
              src={thumbnailPath}
              alt={item.file_name}
              className={`object-cover ${className}`}
              fill
              priority={priority}
              sizes="(max-width: 768px) 33vw, 20vw"
              loading={priority ? undefined : 'lazy'}
              placeholder="empty"
              onError={(e) => {
                // Fallback for failed thumbnails
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                
                // Create and show a fallback element
                if (target.parentElement) {
                  // Create fallback element
                  const fallback = document.createElement('div');
                  fallback.className = 'flex flex-col items-center justify-center w-full h-full bg-secondary/30';
                  fallback.innerHTML = `
                    <div class="flex flex-col items-center text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  `;
                  
                  // Replace the image with the fallback
                  target.style.display = 'none';
                  target.parentElement.appendChild(fallback);
                }
              }}
            />
          </div>
        ) : isVid ? (
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            <VideoIcon className="h-8 w-8 text-white opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs rounded px-1 py-0.5">
              VIDEO
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/30">
            <div className="flex flex-col items-center text-center">
              <FileIcon className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs font-medium mt-1 uppercase px-1 break-all">
                {category || 'FILE'}
              </span>
            </div>
          </div>
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if the item ID changes
    return prevProps.item.id === nextProps.item.id;
  },
);

export default MediaThumbnail;

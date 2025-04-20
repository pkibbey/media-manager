'use client';

import { fileTypeCache } from '@/lib/file-type-cache';
import { isSkippedLargeFile } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import { FileIcon, VideoIcon } from 'lucide-react';
import Image from 'next/image';
import { memo, useEffect, useState } from 'react';

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
        {isImg && !isSkippedLargeFile(item.size_bytes || 0) ? (
          <div className="w-full h-full relative">
            <Image
              src={thumbnailPath ? thumbnailPath : `/api/media?id=${item.id}`} // Fallback to API if path is missing
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
            <VideoIcon className="h-8 w-8 text-white opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs rounded px-1 py-0.5">
              VIDEO
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center">
              <FileIcon className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs font-medium mt-1 uppercase">
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

'use client';

import { isSkippedLargeFile } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import { FileIcon, VideoIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface MediaPreviewProps {
  item: MediaItem;
  isNativelySupported?: boolean;
}

export default function MediaPreview({
  item,
  isNativelySupported,
}: MediaPreviewProps) {
  // Use state to handle the async category fetch
  const [category, setCategory] = useState<string>('other');
  const isImageFile = category === 'image';
  const isVideoFile = category === 'video';
  const fileExtension = item.extension?.toLowerCase();

  // Create API route URL for natively supported formats (when no thumbnail)
  const fileUrl =
    isNativelySupported && !item.thumbnail_path && item.id
      ? `/api/media?id=${item.id}`
      : '';

  // Use useEffect to handle the async operation
  useEffect(() => {
    // Use a workaround to determine the file type synchronously based on extension
    // This avoids the async database call that was causing errors
    const determineFileType = () => {
      const extension = item.extension?.toLowerCase() || '';

      const imageFormats = [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'svg',
        'webp',
        'avif',
        'heic',
        'tiff',
        'tif',
        'raw',
        'bmp',
        'nef',
        'cr2',
        'arw',
        'orf',
      ];
      const videoFormats = [
        'mp4',
        'webm',
        'ogg',
        'mov',
        'avi',
        'wmv',
        'mkv',
        'flv',
        'm4v',
      ];
      const audioFormats = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'];
      const documentFormats = [
        'pdf',
        'doc',
        'docx',
        'txt',
        'rtf',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
      ];

      if (imageFormats.includes(extension)) return 'image';
      if (videoFormats.includes(extension)) return 'video';
      if (audioFormats.includes(extension)) return 'audio';
      if (documentFormats.includes(extension)) return 'document';

      return 'other';
    };

    setCategory(determineFileType());
  }, [item.extension]);

  return (
    <>
      {isImageFile &&
      (item.thumbnail_path || (isNativelySupported && fileUrl)) &&
      !isSkippedLargeFile(item.file_path, item.size_bytes) ? (
        <div className="w-full h-full relative">
          <Image
            src={item.thumbnail_path || fileUrl}
            alt={item.file_name}
            className="object-cover"
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            unoptimized={!!fileUrl} // Don't optimize direct file URLs
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

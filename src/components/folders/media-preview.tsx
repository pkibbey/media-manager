'use client';

import {
  guessFileCategoryClient,
  isImage,
  isSkippedLargeFile,
  isVideo,
} from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import { FileIcon, VideoIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function MediaPreview({ item }: { item: MediaItem }) {
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    const determineFileType = async () => {
      const type = await guessFileCategoryClient(item.extension);
      setType(type);
    };
    determineFileType();
  }, [item.extension]);

  const fileExtension = item.file_name.split('.').pop()?.toLowerCase() || '';
  const isImageFile = isImage(fileExtension);
  const isVideoFile = isVideo(fileExtension);

  return (
    <>
      {isImageFile &&
      item.thumbnail_path &&
      !isSkippedLargeFile(item.file_path, item.size_bytes) ? (
        <div className="w-full h-full relative">
          <Image
            src={item.thumbnail_path}
            alt={item.file_name}
            className="object-cover"
            fill
            sizes="100%"
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
            <span className="text-xs font-medium mt-2">
              {fileExtension ? `.${fileExtension.toUpperCase()}` : 'FILE'}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

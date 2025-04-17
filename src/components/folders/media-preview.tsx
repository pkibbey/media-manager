import { getFileCategory, isSkippedLargeFile } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import { FileIcon, VideoIcon } from 'lucide-react';
import Image from 'next/image';

export default async function MediaPreview({ item }: { item: MediaItem }) {
  const category = await getFileCategory(item.extension);
  const isImageFile = category === 'image';
  const isVideoFile = category === 'video';
  const fileExtension = item.extension?.toLowerCase();

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
            <span className="text-xs font-medium mt-2 uppercase">
              {fileExtension || 'FILE'}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

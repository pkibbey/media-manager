'use client';

import { formatBytes, formatDate } from '@/lib/utils';
import type { MediaItem } from '@/types/supabase';
import {
  FileIcon,
  FileTextIcon,
  ImageIcon,
  PlayIcon,
} from '@radix-ui/react-icons';
import Image from 'next/image';
import { useState } from 'react';

interface MediaListProps {
  items: MediaItem[];
}

export default function MediaList({ items }: MediaListProps) {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  if (items.length === 0) {
    return null;
  }

  // Determine if media can be displayed natively
  const canDisplayNatively = (item: MediaItem) => {
    const imageExtensions = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'avif',
      'svg',
    ];
    const videoExtensions = ['mp4', 'webm', 'ogg'];

    return (
      imageExtensions.includes(item.extension) ||
      videoExtensions.includes(item.extension)
    );
  };

  // Get appropriate icon for media type
  const getMediaIcon = (item: MediaItem) => {
    const extension = item.extension.toLowerCase();

    if (
      [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'avif',
        'svg',
        'heic',
        'tiff',
      ].includes(extension)
    ) {
      return <ImageIcon className="h-6 w-6" />;
    }
    if (['mp4', 'webm', 'mov', 'avi', 'wmv', 'mkv'].includes(extension)) {
      return <PlayIcon className="h-6 w-6" />;
    }
    if (['json', 'txt', 'csv', 'xml'].includes(extension)) {
      return <FileTextIcon className="h-6 w-6" />;
    }
    return <FileIcon className="h-6 w-6" />;
  };

  return (
    <div className="space-y-6">
      {/* Grid of media items */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="border rounded-md overflow-hidden bg-card hover:border-primary transition-colors cursor-pointer"
            onClick={() => setSelectedItem(item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedItem(item);
              }
            }}
            tabIndex={0}
            // biome-ignore lint/a11y/useSemanticElements: <explanation>
            role="button"
            aria-label={`Select ${item.file_name}`}
          >
            {/* Media thumbnail or placeholder */}
            <div className="aspect-square bg-muted relative flex items-center justify-center">
              {canDisplayNatively(item) &&
              item.extension.match(/^(jpg|jpeg|png|gif|webp|avif)$/) ? (
                <Image
                  src={`/api/media?id=${item.id}`}
                  alt={item.file_name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover"
                  unoptimized // Until we have a proper thumbnail service
                />
              ) : (
                <div className="text-muted-foreground">
                  {getMediaIcon(item)}
                </div>
              )}
            </div>

            {/* File name and details */}
            <div className="p-2 space-y-1">
              <p
                className="text-sm font-medium truncate"
                title={item.file_name}
              >
                {item.file_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(item.size_bytes)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Media viewer modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSelectedItem(null);
            }
          }}
        >
          <div
            className="bg-card rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSelectedItem(null);
              }
            }}
          >
            {/* Modal header */}
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium truncate">
                {selectedItem.file_name}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-full hover:bg-muted"
              >
                ×
              </button>
            </div>

            {/* Modal content */}
            <div className="flex-1 overflow-auto p-4">
              <div className="flex flex-col md:flex-row md:gap-8">
                {/* Media preview */}
                <div className="md:flex-1 flex items-center justify-center bg-black/30 rounded-md p-4">
                  {canDisplayNatively(selectedItem) ? (
                    selectedItem.extension.match(/^(mp4|webm|ogg)$/) ? (
                      <video
                        muted
                        src={`/api/media?id=${selectedItem.id}`}
                        controls
                        className="max-h-[70vh] max-w-full"
                      />
                    ) : (
                      <Image
                        src={`/api/media?id=${selectedItem.id}`}
                        alt={selectedItem.file_name}
                        width={800}
                        height={600}
                        className="max-h-[70vh] w-auto h-auto object-contain"
                        unoptimized
                      />
                    )
                  ) : (
                    <div className="text-center p-8">
                      <div className="flex justify-center mb-2">
                        {getMediaIcon(selectedItem)}
                      </div>
                      <p>
                        Preview not available for this file type (.
                        {selectedItem.extension})
                      </p>
                    </div>
                  )}
                </div>

                {/* File details */}
                <div className="md:w-64 mt-4 md:mt-0">
                  <h4 className="font-medium mb-2">File Details</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">File name</dt>
                      <dd className="truncate">{selectedItem.file_name}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd>.{selectedItem.extension}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Size</dt>
                      <dd>{formatBytes(selectedItem.size_bytes)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Date modified</dt>
                      <dd>{formatDate(selectedItem.modified_date)}</dd>
                    </div>
                    {selectedItem.created_date && (
                      <div>
                        <dt className="text-muted-foreground">Date created</dt>
                        <dd>{formatDate(selectedItem.created_date)}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted-foreground">Folder</dt>
                      <dd className="truncate">{selectedItem.folder_path}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-md border hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

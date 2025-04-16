'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { bytesToSize } from '@/lib/utils';
import type { MediaItem } from '@/types';
import { FileIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import type { Exif } from 'exif-reader';
import Image from 'next/image';
import ExifDataDisplay from './exif-data-display';

interface MediaDetailProps {
  item: MediaItem | null;
}

// Helper function to safely type exif_data from Json
function getExifData(item: MediaItem): Exif | null {
  return item.exif_data as Exif | null;
}

export default function MediaDetail({ item }: MediaDetailProps) {
  if (!item) return null;

  // Use properly typed EXIF data
  const exifData = getExifData(item);

  // File type detection based on extension
  const fileExtension = item.extension?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
  const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(fileExtension);

  // Format creation date
  const createdAt = item.created_at
    ? format(new Date(item.created_at), 'PPP')
    : 'Unknown';

  // Format the media date if available (from EXIF data)
  const mediaTakenDate = item.media_date
    ? format(new Date(item.media_date), 'PPP')
    : null;

  return (
    <div className="bg-background border-l shadow-xl">
      <div className="sticky top-0 bg-background z-10 border-b flex flex-col">
        <div className="px-4 py-2">
          <h2 className="text-lg font-semibold truncate" title={item.file_name}>
            {item.file_name}
          </h2>

          <p className="text-xs text-muted-foreground">
            Added on {createdAt} • {bytesToSize(item.size_bytes || 0)}
          </p>
        </div>
        <div className="px-4 py-2 space-y-6">
          {/* Media Preview */}
          <div className="flex flex-col items-center justify-center">
            {isImage && item.width && item.height ? (
              <div className="relative w-full max-h-[600px] bg-muted rounded-md overflow-hidden">
                <Image
                  src={`/api/media?id=${item.id}`}
                  alt={item.file_name}
                  width={item.width}
                  height={item.height}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : isVideo ? (
              <div className="w-full max-h-[400px] bg-muted rounded-md overflow-hidden flex items-center justify-center">
                <video
                  muted
                  src={`/api/media?id=${item.id}`}
                  controls
                  className="max-h-full max-w-full"
                />
              </div>
            ) : (
              <div className="w-full h-[250px] bg-muted rounded-md overflow-hidden flex items-center justify-center">
                <div className="flex flex-col items-center text-muted-foreground">
                  <FileIcon className="h-16 w-16" />
                  <div className="text-lg mt-2">
                    {fileExtension ? `.${fileExtension.toUpperCase()}` : 'File'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Tabs defaultValue="info">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">
                File Info
              </TabsTrigger>
              {item.processed && (
                <TabsTrigger value="exif" className="flex-1">
                  Exif Data
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 gap-y-3 text-sm">
                    <div>
                      <div className="font-medium">File Path</div>
                      <div className="text-muted-foreground overflow-hidden text-ellipsis">
                        {item.file_path}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Size</div>
                      <div>{bytesToSize(item.size_bytes || 0)}</div>
                    </div>
                    {mediaTakenDate && (
                      <div>
                        <div className="font-medium">Date Taken</div>
                        <div>{mediaTakenDate}</div>
                      </div>
                    )}
                    <div>
                      <div className="font-medium">Added to Library</div>
                      <div>{createdAt}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {item.processed && exifData && (
              <TabsContent value="exif" className="mt-4">
                <ExifDataDisplay
                  exifData={exifData}
                  mediaDate={item.media_date}
                  dimensions={{
                    width: item.width || undefined,
                    height: item.height || undefined,
                  }}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

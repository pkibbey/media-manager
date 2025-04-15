'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { bytesToSize } from '@/lib/utils';
import { Cross2Icon, FileIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import Image from 'next/image';
import { useEffect } from 'react';
import { Button } from '../ui/button';
import ExifDataDisplay from './exif-data-display';

interface MediaDetailProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function MediaDetail({
  item,
  isOpen,
  onClose,
}: MediaDetailProps) {
  if (!item) return null;

  const isImage = item.type === 'image';
  const isVideo = item.type === 'video';
  const fileExtension = item.file_name.split('.').pop()?.toLowerCase();

  // Format creation date
  const createdAt = item.created_at
    ? format(new Date(item.created_at), 'PPP')
    : 'Unknown';

  // Format the media date if available (from EXIF data)
  const mediaTakenDate = item.media_date
    ? format(new Date(item.media_date), 'PPP')
    : null;

  // Handle escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-1/3 lg:w-1/4 xl:w-1/3 bg-background border-l shadow-xl overflow-y-auto z-40 animate-in slide-in-from-right">
      <div className="sticky top-0 bg-background z-10 border-b p-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold truncate" title={item.file_name}>
            {item.file_name}
          </h2>
          <p className="text-xs text-muted-foreground">
            Added on {createdAt} • {bytesToSize(item.size || 0)}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <Cross2Icon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Media Preview */}
        <div className="flex flex-col items-center justify-center">
          {isImage ? (
            <div className="relative w-full h-[250px] bg-muted rounded-md overflow-hidden">
              <Image
                src={`/api/media?id=${item.id}`}
                alt={item.file_name}
                fill
                className="object-contain"
              />
            </div>
          ) : isVideo ? (
            <div className="w-full h-[250px] bg-muted rounded-md overflow-hidden flex items-center justify-center">
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
              <TabsTrigger value="metadata" className="flex-1">
                Metadata
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
                    <div>{bytesToSize(item.size || 0)}</div>
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

          {item.processed && (
            <TabsContent value="metadata" className="mt-4">
              <ExifDataDisplay
                metadata={item.metadata}
                mediaDate={item.media_date}
                camera={item.camera}
                lens={item.lens}
                exposureInfo={item.exposure_info}
                focalLength={item.focal_length}
                dimensions={{
                  width: item.width,
                  height: item.height,
                }}
                coordinates={{
                  latitude: item.latitude,
                  longitude: item.longitude,
                }}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

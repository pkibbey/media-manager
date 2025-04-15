'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { bytesToSize } from '@/lib/utils';
import { FileIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import Image from 'next/image';
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{item.file_name}</DialogTitle>
          <DialogDescription>
            Added on {createdAt} • {bytesToSize(item.size || 0)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Media Preview */}
          <div className="flex flex-col items-center justify-center">
            {isImage ? (
              <div className="relative w-full h-[300px] bg-muted rounded-md overflow-hidden">
                <Image
                  src={`/api/media?id=${item.id}`}
                  alt={item.file_name}
                  fill
                  className="object-contain"
                />
              </div>
            ) : isVideo ? (
              <div className="w-full h-[300px] bg-muted rounded-md overflow-hidden flex items-center justify-center">
                <video
                  muted
                  src={`/api/media?id=${item.id}`}
                  controls
                  className="max-h-full max-w-full"
                />
              </div>
            ) : (
              <div className="w-full h-[300px] bg-muted rounded-md overflow-hidden flex items-center justify-center">
                <div className="flex flex-col items-center text-muted-foreground">
                  <FileIcon className="h-16 w-16" />
                  <div className="text-lg mt-2">
                    {fileExtension ? `.${fileExtension.toUpperCase()}` : 'File'}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 w-full">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

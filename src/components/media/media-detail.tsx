'use client';
import { useMediaSelection } from '@/components/folders/media-list';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { bytesToSize, isImage, isVideo } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import { FileIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import type { Exif } from 'exif-reader';
import { memo } from 'react';
import MediaPreview from '../folders/media-preview';
import ExifDataDisplay from './exif-data-display';

// Helper function to safely type exif_data from Json
function getExifData(item: MediaItem): Exif | null {
  return item.exif_data as Exif | null;
}

export function getDimensionsFromExif(exifData: Exif): {
  width: number;
  height: number;
} {
  if (exifData === null) {
    return { width: 0, height: 0 };
  }

  // Try to get dimensions from Image or Photo tags
  if (exifData.Image?.ImageWidth && exifData.Image?.ImageHeight) {
    return {
      width: exifData.Image?.ImageWidth,
      height: exifData.Image?.ImageWidth,
    };
  }

  // Fallback to Photo tags if Image tags are not available
  if (exifData.Photo?.PixelXDimension && exifData.Photo?.PixelYDimension) {
    return {
      width: exifData.Photo?.PixelXDimension,
      height: exifData.Photo?.PixelXDimension,
    };
  }

  // If no dimensions are found, return default values
  return {
    width: 0,
    height: 0,
  };
}

// Use memo to prevent unnecessary re-renders
const MediaDetail = memo(function MediaDetail() {
  // Get the selected item from context instead of props
  const { selectedItem: item } = useMediaSelection();

  if (!item) return null;

  // Use properly typed EXIF data
  const exifData = getExifData(item);
  const exifDimensions = exifData && getDimensionsFromExif(exifData);

  // File type detection based on extension
  const fileExtension = item.extension?.toLowerCase();
  const isImageFile = isImage(fileExtension);
  const isVideoFile = isVideo(fileExtension);

  // Format creation date
  const createdAt = item.created_at
    ? format(new Date(item.created_at), 'PPP')
    : 'Unknown';

  // Format the media date if available (from EXIF data)
  const mediaTakenDate = item.media_date
    ? format(new Date(item.media_date), 'PPP')
    : null;

  return (
    <div className="bg-background md:border-l md:pl-6 shadow-xl md:h-full">
      <div className="sticky top-0 bg-background z-10 flex flex-col">
        <div className="py-2">
          <h2 className="text-lg font-semibold truncate" title={item.file_name}>
            {item.file_name}
          </h2>

          <p className="text-xs text-muted-foreground">
            Added on {createdAt} • {bytesToSize(item.size_bytes || 0)}
          </p>
        </div>
        <div className="py-2 space-y-4">
          {/* Media Preview */}
          <div className="flex flex-col items-center justify-center">
            {isImageFile ? (
              <div className="w-full bg-muted rounded-md overflow-hidden flex items-center justify-center">
                {exifData && (
                  <MediaPreview
                    item={item}
                    fill={false}
                    width={exifDimensions?.width}
                    height={exifDimensions?.height}
                  />
                )}
              </div>
            ) : isVideoFile ? (
              <div className="w-full max-h-[400px] lg:max-h-[600px] bg-muted rounded-md overflow-hidden flex items-center justify-center">
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

            <TabsContent value="info" className="mt-2">
              <Card className="py-4">
                <CardContent className="px-4">
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
                    {!item.processed && (
                      <div>
                        <div className="font-medium">
                          EXIF Processing Status
                        </div>
                        <div className="text-amber-500 dark:text-amber-400">
                          Pending
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {item.processed && exifData && (
              <TabsContent value="exif" className="mt-4">
                <ExifDataDisplay
                  exifData={exifData}
                  mediaDate={item.media_date}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
});

export default MediaDetail;

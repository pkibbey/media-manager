'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { bytesToSize, isImage } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import { FileIcon, HandIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import type { Exif } from 'exif-reader';
import { memo, useCallback, useEffect, useState } from 'react';
import ExifDataDisplay from './exif-data-display';
import MediaFullView from './media-full-view';
import { useMediaSelection } from './media-list';

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
  if (exifData.Image?.ImageWidth && exifData.Image?.ImageLength) {
    return {
      width: exifData.Image?.ImageWidth,
      height: exifData.Image?.ImageLength,
    };
  }

  // Fallback to Photo tags if Image tags are not available
  if (exifData.Photo?.PixelXDimension && exifData.Photo?.PixelYDimension) {
    return {
      width: exifData.Photo?.PixelXDimension,
      height: exifData.Photo?.PixelYDimension,
    };
  }

  // If no dimensions are found, return default values
  return {
    width: 0,
    height: 0,
  };
}

// Local storage key for zoom preference
const ZOOM_PREFERENCE_KEY = 'media-detail-zoom-mode';

// Use memo to prevent unnecessary re-renders
const MediaDetail = memo(function MediaDetail() {
  // Get the selected item from context instead of props
  const { selectedItems } = useMediaSelection();
  const [zoomMode, setZoomMode] = useState(false);

  // Load zoom preference from local storage on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem(ZOOM_PREFERENCE_KEY);
    if (savedPreference) {
      setZoomMode(savedPreference === 'true');
    }
  }, []);

  // Toggle zoom mode and save to local storage
  const toggleZoomMode = useCallback(() => {
    setZoomMode((prev) => {
      const newValue = !prev;
      localStorage.setItem(ZOOM_PREFERENCE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  // If there are no selected items, return placeholder
  if (selectedItems.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileIcon className="h-10 w-10 mx-auto mb-2" />
          <p>Select a file to view details</p>
        </div>
      </div>
    );
  }

  // We'll just show the first selected item for now
  const item = selectedItems[0];
  const exifData = getExifData(item);
  const isImageFile = isImage(item.extension);

  return (
    <div className="sticky top-6 flex flex-col">
      <div className="relative overflow-hidden bg-background">
        {isImageFile && (
          <div
            className={
              'absolute top-2 right-2 z-10 flex space-x-2 bg-background/80 backdrop-blur-sm p-1 rounded-md shadow-md'
            }
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={zoomMode}
                    onPressedChange={toggleZoomMode}
                    size="sm"
                    variant="outline"
                    aria-label="Toggle zoom mode"
                  >
                    <HandIcon className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Toggle zoom mode for rotated images</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        <div
          className={`w-full h-full flex items-center justify-center overflow-hidden ${
            zoomMode ? 'media-zoom-mode' : ''
          }`}
        >
          <MediaFullView item={item} zoomMode={zoomMode} />
        </div>
      </div>

      <Card className="flex-shrink-0 max-h-[40%] overflow-hidden border-t rounded-none">
        <CardContent className="p-4 h-full overflow-y-auto">
          <Tabs defaultValue="info">
            <TabsList className="mb-4">
              <TabsTrigger value="info">Info</TabsTrigger>
              {isImageFile && exifData && (
                <TabsTrigger value="exif">EXIF Data</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">{item.file_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.folder_path}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p>{bytesToSize(item.size_bytes || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="uppercase">{item.extension}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Modified</p>
                  <p>
                    {item.modified_date
                      ? format(
                          new Date(item.modified_date),
                          'MMM d, yyyy h:mm a',
                        )
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Media Date</p>
                  <p>
                    {item.media_date
                      ? format(new Date(item.media_date), 'MMM d, yyyy h:mm a')
                      : 'Unknown'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Processing Status</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span
                      className={`px-2 py-1 text-xs rounded-md ${
                        item.processed
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                      }`}
                    >
                      {item.processed ? 'Processed' : 'Unprocessed'}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded-md ${
                        item.has_exif
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {item.has_exif ? 'EXIF Data' : 'No EXIF'}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded-md ${
                        item.organized
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {item.organized ? 'Organized' : 'Unorganized'}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {isImageFile && exifData && (
              <TabsContent value="exif">
                <ExifDataDisplay exifData={exifData} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
});

export default MediaDetail;

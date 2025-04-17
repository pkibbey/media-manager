'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { bytesToSize, isImage, isVideo } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import { FileIcon } from '@radix-ui/react-icons';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import type { Exif } from 'exif-reader';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import ExifDataDisplay from './exif-data-display';

interface MediaDetailProps {
  item: MediaItem | null;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to safely type exif_data from Json
function getExifData(item: MediaItem): Exif | null {
  return item.exif_data as Exif | null;
}

export default function MediaDetail({ item }: MediaDetailProps) {
  const [processingEstimate, setProcessingEstimate] = useState<number | null>(
    null,
  );
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false);

  // Fetch performance metrics for estimation when item is unprocessed
  useEffect(() => {
    async function fetchProcessingEstimate() {
      if (!item || item.processed) return;

      setIsLoadingEstimate(true);
      try {
        // Fetch performance metrics for similar file types
        const { data: metrics, error } = await supabase
          .from('performance_metrics')
          .select('*')
          .eq('file_type', item.extension.toLowerCase())
          .eq('success', true)
          .order('timestamp', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error fetching performance metrics:', error);
          return;
        }

        if (metrics && metrics.length > 0) {
          // Calculate average processing time in ms
          const totalDuration = metrics.reduce(
            (sum, metric) => sum + metric.duration,
            0,
          );
          const avgDuration = totalDuration / metrics.length;
          setProcessingEstimate(avgDuration);
        }
      } catch (error) {
        console.error('Error calculating processing estimate:', error);
      } finally {
        setIsLoadingEstimate(false);
      }
    }

    fetchProcessingEstimate();
  }, [item]);

  if (!item) return null;

  // Use properly typed EXIF data
  const exifData = getExifData(item);

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

  // Format processing time estimate for display
  const formattedEstimate = processingEstimate
    ? processingEstimate > 1000
      ? `${(processingEstimate / 1000).toFixed(2)} seconds`
      : `${processingEstimate.toFixed(0)} ms`
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
            {isImageFile && item.width && item.height ? (
              <div className="relative w-full max-h-[600px] bg-muted rounded-md overflow-hidden">
                <Image
                  src={`/api/media?id=${item.id}`}
                  alt={item.file_name}
                  width={item.width}
                  height={item.height}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : isVideoFile ? (
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
                    {!item.processed && (
                      <div>
                        <div className="font-medium">
                          EXIF Processing Status
                        </div>
                        <div className="text-amber-500 dark:text-amber-400">
                          {isLoadingEstimate
                            ? 'Calculating estimate...'
                            : formattedEstimate
                              ? `Pending (est. time: ${formattedEstimate})`
                              : 'Pending (no time estimate available)'}
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

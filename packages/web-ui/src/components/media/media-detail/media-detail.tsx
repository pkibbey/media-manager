'use client';

import { Eye, EyeOff, FileType, HardDrive, MapPin, Trash } from 'lucide-react';
import type { PredictionType } from 'nsfwjs';
import { useMediaSelection } from '@/components/media/media-list/media-selection-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatBytes } from 'shared/consts';
import { BoundingBoxImage, DetectedObject } from './bounding-box-image';
import { DetailField } from './detail-field';
import { ExifDataDisplay } from './exif-data-display';

export function MediaDetail() {
  const { selectedMedia, toggleHideSelected, toggleDeleteSelected } =
    useMediaSelection();

  // If no files are selected, show empty state
  if (selectedMedia.length === 0) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <CardTitle className="text-lg">Details</CardTitle>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a file to view details
        </div>
      </div>
    );
  }

  // Get the first selected file for display
  const media = selectedMedia[0];
  const fileName = media.media_path.split('/').pop() || media.media_path;

  const objects = media.analysis_data?.objects;
  const objectsWithType = objects
    ? (objects as unknown as DetectedObject[])
    : [];

  const contentWarnings = (media.analysis_data?.content_warnings ||
    []) as PredictionType[];

  const processingStatus = (
    <div className="grid grid-cols-2 gap-4 mt-4">
      <DetailField
        label="EXIF Data"
        value={
          <Badge variant={media.is_exif_processed ? 'success' : 'outline'}>
            {media.is_exif_processed ? 'Processed' : 'Pending'}
          </Badge>
        }
      />
      <DetailField
        label="Thumbnail"
        value={
          <Badge variant={media.is_thumbnail_processed ? 'success' : 'outline'}>
            {media.is_thumbnail_processed ? 'Generated' : 'Pending'}
          </Badge>
        }
      />
      <DetailField
        label="Analysis"
        value={
          <Badge variant={media.is_basic_processed ? 'success' : 'outline'}>
            {media.is_basic_processed ? 'Complete' : 'Pending'}
          </Badge>
        }
      />
      <DetailField
        label="Status"
        value={
          media.is_deleted ? (
            <Badge variant="destructive">Deleted</Badge>
          ) : media.is_hidden ? (
            <Badge variant="secondary">Hidden</Badge>
          ) : (
            <Badge variant="default">Visible</Badge>
          )
        }
      />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="px-4 py-3 flex flex-row justify-between items-center">
        <CardTitle className="text-lg">
          {selectedMedia.length > 1
            ? `${selectedMedia.length} files selected`
            : 'File Details'}
        </CardTitle>

        {/* Action buttons for single file view */}
        {selectedMedia.length === 1 && (
          <div className="flex gap-2">
            <Button
              variant={media.is_hidden ? 'default' : 'outline'}
              size="icon"
              onClick={() => toggleHideSelected()}
              title={media.is_hidden ? 'Unhide' : 'Hide'}
            >
              {media.is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
            </Button>
            <Button
              variant={media.is_deleted ? 'default' : 'destructive'}
              size="icon"
              onClick={() => toggleDeleteSelected()}
              title={media.is_deleted ? 'Restore' : 'Delete'}
            >
              <Trash size={16} />
            </Button>
          </div>
        )}
      </CardHeader>

      {/* If multiple files selected, show summary info */}
      {selectedMedia.length > 1 ? (
        <CardContent>
          <p>
            {selectedMedia.length} files selected with a total size of{' '}
            {formatBytes(
              selectedMedia.reduce((sum, file) => sum + file.size_bytes, 0),
            )}
          </p>

          {/* File type breakdown */}
          <div className="mt-4">
            <h3 className="text-sm font-medium">File Type Breakdown:</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(
                selectedMedia.reduce(
                  (acc, file) => {
                    const type = file.media_types?.description || 'unknown';
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>,
                ),
              ).map(([type, count]) => (
                <Badge key={type} variant="secondary">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </div>

          {/* Processing status */}
          <div className="mt-4">
            <h3 className="text-sm font-medium">Processing Status:</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
              <div>
                EXIF Processed:{' '}
                {selectedMedia.filter((m) => m.is_exif_processed).length}
              </div>
              <div>
                Thumbnails:{' '}
                {selectedMedia.filter((m) => m.is_thumbnail_processed).length}
              </div>
              <div>
                Analysis:{' '}
                {selectedMedia.filter((m) => m.is_basic_processed).length}
              </div>
              <div>
                Hidden: {selectedMedia.filter((m) => m.is_hidden).length}
              </div>
            </div>
          </div>

          {/* Batch operations */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleHideSelected()}
            >
              {selectedMedia.some((m) => !m.is_hidden)
                ? 'Hide All'
                : 'Unhide All'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => toggleDeleteSelected()}
            >
              {selectedMedia.some((m) => !m.is_deleted)
                ? 'Delete All'
                : 'Restore All'}
            </Button>
          </div>
        </CardContent>
      ) : (
        /* Single file detailed view */
        <div className="flex-1 overflow-auto">
          {/* Preview */}
          <div className="p-4 border-b">
            <BoundingBoxImage
              src={`/api/media/${media.id}`}
              alt={fileName}
              objects={objectsWithType}
              width={Math.min(media.exif_data?.width || 600, 600)}
              height={Math.min(media.exif_data?.height || 600, 600)}
            />
          </div>

          {/* Tabs for different information categories */}
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">
                Info
              </TabsTrigger>
              {media.exif_data && (
                <TabsTrigger value="exif" className="flex-1">
                  EXIF
                </TabsTrigger>
              )}
              {media.analysis_data && (
                <TabsTrigger value="analysis" className="flex-1">
                  Analysis
                </TabsTrigger>
              )}
              <TabsTrigger value="processing" className="flex-1">
                Status
              </TabsTrigger>
            </TabsList>

            {/* Basic Information */}
            <TabsContent value="info" className="p-4">
              <div className="space-y-4">
                <DetailField
                  label="Filename"
                  value={<p className="break-all">{fileName}</p>}
                />

                <Separator />

                <DetailField
                  label="File Path"
                  value={<p className="break-all">{media.media_path}</p>}
                />

                {media.media_types?.mime_type && (
                  <>
                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <DetailField
                        label="File Type"
                        value={
                          <div className="flex items-center gap-2">
                            <FileType size={16} />
                            {media.media_types.mime_type}
                          </div>
                        }
                      />
                      <DetailField
                        label="Size"
                        value={
                          <div className="flex items-center gap-2">
                            <HardDrive size={16} />
                            {formatBytes(media.size_bytes)}
                          </div>
                        }
                      />
                    </div>
                  </>
                )}

                <Separator />

                {media.exif_data?.gps_latitude &&
                  media.exif_data?.gps_longitude && (
                    <>
                      <Separator />
                      <DetailField
                        label="Location"
                        value={
                          <div className="flex items-center gap-2">
                            <MapPin size={16} />
                            {media.exif_data.gps_latitude.toFixed(6)},{' '}
                            {media.exif_data.gps_longitude.toFixed(6)}
                          </div>
                        }
                      />
                    </>
                  )}

                {media.media_types?.mime_type && (
                  <>
                    <Separator />
                    <DetailField
                      label="MIME Type"
                      value={media.media_types.mime_type}
                    />
                  </>
                )}

                {/* Display dimensions if available */}
                {media.exif_data?.width && media.exif_data?.height && (
                  <>
                    <Separator />
                    <DetailField
                      label="Dimensions"
                      value={`${media.exif_data.width} × ${media.exif_data.height} pixels`}
                    />
                  </>
                )}
              </div>
            </TabsContent>

            {/* EXIF Information */}
            {media.exif_data && (
              <TabsContent value="exif" className="p-4">
                <ExifDataDisplay exif={media.exif_data} />
              </TabsContent>
            )}

            {/* Analysis Information */}
            {media.analysis_data && (
              <TabsContent value="analysis" className="p-4">
                <div className="space-y-4">
                  {media.analysis_data.image_description && (
                    <DetailField
                      label="Description"
                      value={media.analysis_data.image_description}
                    />
                  )}

                  {media.analysis_data.image_description &&
                    media.analysis_data.keywords &&
                    media.analysis_data.keywords.length > 0 && <Separator />}

                  {media.analysis_data.keywords &&
                    media.analysis_data.keywords.length > 0 && (
                      <DetailField
                        label="Tags"
                        value={
                          <div className="flex flex-wrap gap-1">
                            {media.analysis_data.keywords.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        }
                      />
                    )}

                  <div className="flex gap-4">
                    <div>
                      {objectsWithType && objectsWithType.length > 0 && (
                        <>
                          <Separator />
                          <DetailField
                            label="Objects Detected"
                            value={
                              <div className="flex flex-wrap gap-1">
                                {objectsWithType.map((object, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {object.class} ({object.score.toFixed(2)})
                                  </Badge>
                                ))}
                              </div>
                            }
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {media.analysis_data.colors &&
                    media.analysis_data.colors.length > 0 && (
                      <>
                        <Separator />
                        <DetailField
                          label="Dominant Colors"
                          value={
                            <div className="flex flex-wrap gap-2">
                              {media.analysis_data.colors.map(
                                (color, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-1"
                                  >
                                    <div
                                      className="w-4 h-4 rounded-full border"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span className="text-xs">{color}</span>
                                  </div>
                                ),
                              )}
                            </div>
                          }
                        />
                      </>
                    )}

                  {contentWarnings && (
                    <>
                      <Separator />
                      <DetailField
                        label="Content Warnings"
                        value={
                          <div className="flex flex-wrap gap-1">
                            {contentWarnings.map((safetyLevel, index) => (
                              <Badge
                                key={index}
                                variant={
                                  safetyLevel.className === 'Neutral'
                                    ? 'success'
                                    : safetyLevel.className === 'Sexy'
                                      ? 'warning'
                                      : 'destructive'
                                }
                                className="text-xs"
                              >
                                {safetyLevel.className} (
                                {safetyLevel.probability.toFixed(2)})
                              </Badge>
                            ))}
                          </div>
                        }
                      />
                    </>
                  )}
                </div>
              </TabsContent>
            )}

            {/* Processing Status Tab */}
            <TabsContent value="processing" className="p-4">
              <div className="space-y-4">
                <DetailField
                  label="File ID"
                  value={
                    <code className="bg-muted p-1 rounded text-xs">
                      {media.id}
                    </code>
                  }
                />

                <Separator />

                {processingStatus}

                {media.exif_data && (
                  <>
                    <Separator />
                    <DetailField
                      label="Last Modified"
                      value={formatDate(String(media.exif_data.exif_timestamp))}
                    />
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

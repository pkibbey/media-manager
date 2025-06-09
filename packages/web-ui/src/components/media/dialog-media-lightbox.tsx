'use client';

import {
  type ExifProcessingMethod,
  addMediaToExifQueue,
} from '@/actions/media/add-media-to-exif-queue';
import { addMediaToFixDatesQueue } from '@/actions/media/add-media-to-fix-dates-queue';
import { addMediaToThumbnailQueue } from '@/actions/media/add-media-to-thumbnail-queue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useMediaLightbox } from '@/contexts/media-lightbox-context';
import { Camera, ChevronDown, Clock, Eye, MapPin } from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
import { formatBytes } from 'shared/consts';
import type { SpeedProcessingMethod } from 'shared/types';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: Array<{
    label: string;
    onClick: () => void;
    description?: string;
  }>;
}

function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
      >
        {trigger}
      </div>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
            >
              <div className="font-medium text-sm">{item.label}</div>
              {item.description && (
                <div className="text-xs text-gray-500">{item.description}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
}: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </h4>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function DialogMediaLightbox() {
  const { isOpen, media, closeLightbox } = useMediaLightbox();
  const [isProcessing, setIsProcessing] = useState<{
    thumbnail?: boolean;
    exif?: boolean;
    fixDates?: boolean;
  }>({});

  const handleReprocess = async (
    type: 'thumbnail' | 'exif' | 'fixDates',
    method?: string,
  ) => {
    if (!media) return;

    setIsProcessing((prev) => ({ ...prev, [type]: true }));

    try {
      let result: { success: boolean; error?: string };
      switch (type) {
        case 'thumbnail':
          result = await addMediaToThumbnailQueue(
            media.id,
            media.media_path,
            method as SpeedProcessingMethod,
          );
          break;
        case 'exif':
          result = await addMediaToExifQueue(
            media.id,
            media.media_path,
            method as ExifProcessingMethod,
          );
          break;
        case 'fixDates':
          result = await addMediaToFixDatesQueue(
            media.id,
            media.media_path,
            media.exif_data?.exif_timestamp || null,
          );
          break;
      }

      if (result.success) {
        console.log(`Successfully added ${media.id} to ${type} queue`);
      } else {
        console.error(
          `Failed to add ${media.id} to ${type} queue:`,
          result.error,
        );
      }
    } catch (error) {
      console.error(`Error reprocessing ${type}:`, error);
    } finally {
      setIsProcessing((prev) => ({ ...prev, [type]: false }));
    }
  };

  if (!media) return null;

  const fileName = media.media_path.split('/').pop() || media.media_path;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatGPSCoordinates = (lat?: number | null, lng?: number | null) => {
    if (!lat || !lng) return null;
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeLightbox()}>
      <DialogContent className="min-w-full h-full p-0 gap-0">
        <DialogTitle className="sr-only">{fileName}</DialogTitle>
        <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden">
          {/* Image Section */}
          <div className="flex-1 flex items-center justify-center bg-black">
            <div className="relative max-w-full max-h-full">
              <img
                src={`/api/media/${media.id}`}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: 'calc(90vh - 2rem)' }}
              />
            </div>
          </div>

          {/* Info Panel */}
          <div className="w-full lg:w-96 bg-white flex flex-col">
            {/* Content */}
            <ScrollArea className="h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2
                  className="text-lg font-semibold text-neutral-100 truncate"
                  title={fileName}
                >
                  {fileName}
                </h2>
              </div>

              <div className="space-y-6 p-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-100">
                    File Information
                  </h3>

                  <DetailField
                    label="File Size"
                    value={formatBytes(media.size_bytes || 0)}
                  />

                  <DetailField
                    label="Dimensions"
                    value={
                      media.exif_data?.width && media.exif_data?.height ? (
                        <span
                          className={
                            media.exif_data.width < 160 ||
                            media.exif_data.height < 160
                              ? 'text-orange-600'
                              : ''
                          }
                        >
                          {media.exif_data.width} × {media.exif_data.height}{' '}
                          pixels
                        </span>
                      ) : (
                        'Unknown'
                      )
                    }
                  />

                  <DetailField
                    label="Type"
                    value={
                      <Badge variant="outline" className="text-xs">
                        {media.media_types?.mime_type || 'Unknown'}
                      </Badge>
                    }
                  />

                  <DetailField
                    label="Created"
                    value={
                      media.exif_data?.exif_timestamp
                        ? formatDate(media.exif_data.exif_timestamp)
                        : 'Unknown'
                    }
                  />

                  {/* Copy Full Path Button */}
                  <div className="flex items-center gap-2 max-w8">
                    <span
                      className="text-xs text-gray-500 truncate"
                      title={media.media_path}
                    >
                      {media.media_path}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      aria-label="Copy full path"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(media.media_path);
                        } catch {
                          // Clipboard API may fail
                        }
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.5 8.25V6.75A2.25 2.25 0 0014.25 4.5h-6A2.25 2.25 0 006 6.75v10.5A2.25 2.25 0 008.25 19.5h6A2.25 2.25 0 0016.5 17.25v-1.5M9.75 15.75h6A2.25 2.25 0 0018 13.5v-6A2.25 2.25 0 0015.75 5.25h-6A2.25 2.25 0 007.5 7.5v6a2.25 2.25 0 002.25 2.25z"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* EXIF Data */}
                {media.exif_data && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-neutral-100">
                        Camera Information
                      </h3>

                      {media.exif_data.camera_make && (
                        <DetailField
                          label="Camera Make"
                          value={media.exif_data.camera_make}
                        />
                      )}

                      {media.exif_data.camera_model && (
                        <DetailField
                          label="Camera Model"
                          value={media.exif_data.camera_model}
                        />
                      )}

                      {media.exif_data.lens_model && (
                        <DetailField
                          label="Lens"
                          value={media.exif_data.lens_model}
                        />
                      )}

                      {/* Camera Settings */}
                      <div className="grid grid-cols-2 gap-4">
                        {media.exif_data.aperture && (
                          <DetailField
                            label="Aperture"
                            value={`f/${media.exif_data.aperture}`}
                          />
                        )}

                        {media.exif_data.exposure_time && (
                          <DetailField
                            label="Shutter"
                            value={`${media.exif_data.exposure_time}s`}
                          />
                        )}

                        {media.exif_data.iso && (
                          <DetailField
                            label="ISO"
                            value={media.exif_data.iso}
                          />
                        )}

                        {media.exif_data.focal_length_35mm && (
                          <DetailField
                            label="Focal Length"
                            value={`${media.exif_data.focal_length_35mm}mm`}
                          />
                        )}
                      </div>

                      {/* Date Information */}
                      {media.exif_data.exif_timestamp && (
                        <DetailField
                          label="Date Taken"
                          value={formatDate(media.exif_data.exif_timestamp)}
                        />
                      )}

                      {/* GPS Information */}
                      {formatGPSCoordinates(
                        media.exif_data.gps_latitude,
                        media.exif_data.gps_longitude,
                      ) && (
                        <DetailField
                          label="Location"
                          value={
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {formatGPSCoordinates(
                                media.exif_data.gps_latitude,
                                media.exif_data.gps_longitude,
                              )}
                            </div>
                          }
                        />
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                {/* Analysis Data */}
                {media.analysis_data && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-neutral-100">
                        Analysis
                      </h3>

                      {/* Image Description */}
                      {media.analysis_data.image_description && (
                        <DetailField
                          label="Description"
                          value={media.analysis_data.image_description}
                        />
                      )}

                      {/* Keywords */}
                      {media.analysis_data.keywords &&
                        media.analysis_data.keywords.length > 0 && (
                          <DetailField
                            label="Keywords"
                            value={
                              <div className="flex flex-wrap gap-1">
                                {media.analysis_data.keywords.map(
                                  (keyword: string, index: number) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {keyword}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            }
                          />
                        )}
                    </div>
                    <Separator />
                  </>
                )}

                {/* Processing Actions */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-100">
                    Reprocess
                  </h3>

                  <div className="space-y-2">
                    {/* Thumbnail Reprocessing */}
                    <DropdownMenu
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-between"
                          disabled={isProcessing.thumbnail}
                        >
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            {isProcessing.thumbnail
                              ? 'Processing...'
                              : 'Regenerate Thumbnail'}
                          </div>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      }
                      items={[
                        {
                          label: 'Ultra Fast',
                          description: 'Extract embedded thumbnail',
                          onClick: () => handleReprocess('thumbnail', 'ultra'),
                        },
                        {
                          label: 'Fast',
                          description: 'Quick resize generation',
                          onClick: () => handleReprocess('thumbnail', 'fast'),
                        },
                        {
                          label: 'Slow',
                          description: 'High quality generation',
                          onClick: () => handleReprocess('thumbnail', 'slow'),
                        },
                      ]}
                    />

                    {/* EXIF Reprocessing */}
                    <DropdownMenu
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-between"
                          disabled={isProcessing.exif}
                        >
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4" />
                            {isProcessing.exif
                              ? 'Processing...'
                              : 'Reprocess EXIF'}
                          </div>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      }
                      items={[
                        {
                          label: 'Fast',
                          description: 'Quick EXIF extraction',
                          onClick: () => handleReprocess('exif', 'fast'),
                        },
                        {
                          label: 'Slow',
                          description: 'Comprehensive extraction',
                          onClick: () => handleReprocess('exif', 'slow'),
                        },
                      ]}
                    />

                    {/* Fix Dates */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={isProcessing.fixDates}
                      onClick={() => handleReprocess('fixDates')}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {isProcessing.fixDates
                          ? 'Processing...'
                          : 'Fix Date from Filename'}
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Processing Status */}
                {(media.thumbnail_process ||
                  media.exif_data?.exif_process ||
                  media.exif_data?.fix_date_process) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-neutral-100">
                        Processing Status
                      </h3>

                      {media.exif_data?.exif_process && (
                        <DetailField
                          label="Exif Process"
                          value={
                            <Badge variant="outline" className="text-xs">
                              {media.exif_data.exif_process}
                            </Badge>
                          }
                        />
                      )}

                      {media.thumbnail_process && (
                        <DetailField
                          label="Thumbnail Process"
                          value={
                            <Badge variant="outline" className="text-xs">
                              {media.thumbnail_process}
                            </Badge>
                          }
                        />
                      )}

                      {media.exif_data?.fix_date_process && (
                        <DetailField
                          label="Date Fix Process"
                          value={
                            <Badge variant="outline" className="text-xs">
                              {media.exif_data.fix_date_process}
                            </Badge>
                          }
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

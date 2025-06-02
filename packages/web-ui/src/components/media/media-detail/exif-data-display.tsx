'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import type { Tables } from 'shared/types';

interface ExifDataDisplayProps {
  exif: Tables<'exif_data'>;
}

export function ExifDataDisplay({ exif }: ExifDataDisplayProps) {
  if (!exif) return <p>No EXIF data available</p>;

  const locationFormatted = formatGPSCoordinates(
    exif.gps_latitude,
    exif.gps_longitude,
  );

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {/* Camera Information */}
        {(exif.camera_make || exif.camera_model) && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Camera Information</h3>

            {exif.camera_make && (
              <div>
                <h4 className="text-xs text-muted-foreground">Make</h4>
                <p>{exif.camera_make}</p>
              </div>
            )}

            {exif.camera_model && (
              <div>
                <h4 className="text-xs text-muted-foreground">Model</h4>
                <p>{exif.camera_model}</p>
              </div>
            )}
          </div>
        )}

        {(exif.camera_make || exif.camera_model) && <Separator />}

        {/* Date Information */}
        {exif.exif_timestamp && (
          <div>
            <h3 className="text-sm font-medium">Date Taken</h3>
            <p>{new Date(exif.exif_timestamp).toLocaleString()}</p>
          </div>
        )}

        {exif.exif_timestamp && <Separator />}

        {/* Technical Settings */}
        {(exif.iso ||
          exif.exposure_time ||
          exif.aperture ||
          exif.focal_length_35mm) && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Technical Settings</h3>

            <div className="grid grid-cols-2 gap-2">
              {exif.iso && (
                <div>
                  <h4 className="text-xs text-muted-foreground">ISO</h4>
                  <p>{exif.iso}</p>
                </div>
              )}

              {exif.exposure_time && (
                <div>
                  <h4 className="text-xs text-muted-foreground">Exposure</h4>
                  <p>{exif.exposure_time}s</p>
                </div>
              )}

              {exif.aperture && (
                <div>
                  <h4 className="text-xs text-muted-foreground">Aperture</h4>
                  <p>f/{exif.aperture}</p>
                </div>
              )}

              {exif.focal_length_35mm && (
                <div>
                  <h4 className="text-xs text-muted-foreground">
                    Focal Length
                  </h4>
                  <p>{exif.focal_length_35mm}mm</p>
                </div>
              )}
            </div>
          </div>
        )}

        {(exif.iso ||
          exif.exposure_time ||
          exif.aperture ||
          exif.focal_length_35mm) && <Separator />}

        {/* Dimensions */}
        {(exif.width || exif.height) && (
          <div>
            <h3 className="text-sm font-medium">Dimensions</h3>
            <p>
              {exif.width} × {exif.height} pixels
            </p>
            {exif.orientation && (
              <Badge variant="outline" className="mt-1">
                Orientation: {exif.orientation}
              </Badge>
            )}
          </div>
        )}

        {(exif.width || exif.height) && <Separator />}

        {/* Location */}
        {locationFormatted && (
          <div>
            <h3 className="text-sm font-medium">Location</h3>
            <p>{locationFormatted}</p>

            {/* Simple Map Preview */}
            {exif.gps_latitude && exif.gps_longitude && (
              <Card className="mt-2 overflow-hidden h-[150px] relative">
                <Image
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${exif.gps_latitude},${exif.gps_longitude}&zoom=13&size=600x300&maptype=roadmap&markers=color:red%7C${exif.gps_latitude},${exif.gps_longitude}&key=YOUR_API_KEY`}
                  alt="Location Map"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <p className="text-xs text-muted-foreground">
                    Map preview available in full version
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

/**
 * Format GPS coordinates for display
 *
 * @param latitude - Latitude in decimal format
 * @param longitude - Longitude in decimal format
 * @returns Formatted coordinates or null if invalid
 */
export function formatGPSCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string | null {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {
    return null;
  }

  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';

  const latAbs = Math.abs(latitude);
  const lonAbs = Math.abs(longitude);

  return `${latAbs.toFixed(6)}° ${latDir}, ${lonAbs.toFixed(6)}° ${lonDir}`;
}

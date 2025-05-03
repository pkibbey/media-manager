'use client';

import { ExternalLinkIcon, GlobeIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import type { Tags } from 'exifreader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  formatExposureInfo,
  formatFocalLength,
  formatGpsCoordinates,
  getGoogleMapsUrl,
} from '@/lib/utils';

interface ExifDataDisplayProps {
  exifData: Tags;
  mediaDate?: string | null;
}

export default function ExifDataDisplay({
  exifData,
  mediaDate,
}: ExifDataDisplayProps) {
  // Format the media date if available
  const formattedDate = mediaDate ? format(new Date(mediaDate), 'PPpp') : null;

  // Extract exifData fields using proper Exif type nested properties
  const cameraModel = exifData.Model
    ? exifData.Make
      ? `${exifData.Make.toString().trim()} ${exifData.Model.toString().trim()}`
      : exifData.Model.toString().trim()
    : exifData.Make?.toString().trim();

  const lens =
    exifData.LensModel?.toString().trim() ||
    (exifData.LensSpecification ? String(exifData.LensSpecification) : null);

  // Use formatExposureInfo utility function instead of manual formatting
  const exposureInfo = formatExposureInfo(exifData);

  // Use formatFocalLength utility function instead of manual formatting
  const focalLength = formatFocalLength(exifData);

  // Format the GPS coordinates if available
  const formattedCoordinates =
    exifData.GPSLatitude?.description && exifData.GPSLongitude?.description
      ? formatGpsCoordinates(exifData.GPSLatitude, exifData.GPSLongitude)
      : null;

  // Get Google Maps URL if coordinates are available
  const mapsUrl =
    exifData.GPSLatitude && exifData.GPSLongitude
      ? getGoogleMapsUrl(exifData.GPSLatitude, exifData.GPSLongitude)
      : null;

  // Format dimensions
  const formattedDimensions =
    exifData.ImageWidth && exifData.ImageLength
      ? `${exifData.ImageWidth} × ${exifData.ImageLength}`
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image Exif Data</CardTitle>
        <CardDescription>
          Technical information extracted from the image file
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {/* Date/Time */}
          {formattedDate && (
            <div>
              <div className="font-medium">Date Taken</div>
              <div>{formattedDate}</div>
            </div>
          )}

          {/* Dimensions */}
          {formattedDimensions && (
            <div>
              <div className="font-medium">Dimensions</div>
              <div>{formattedDimensions}</div>
            </div>
          )}

          {/* Camera */}
          {cameraModel && (
            <div>
              <div className="font-medium">Camera</div>
              <div>{cameraModel}</div>
            </div>
          )}

          {/* Lens */}
          {lens && (
            <div>
              <div className="font-medium">Lens</div>
              <div>{lens}</div>
            </div>
          )}

          {/* Exposure Info */}
          {exposureInfo && (
            <div>
              <div className="font-medium">Exposure</div>
              <div>{exposureInfo}</div>
            </div>
          )}

          {/* Focal Length */}
          {focalLength && (
            <div>
              <div className="font-medium">Focal Length</div>
              <div>{focalLength}</div>
            </div>
          )}

          {/* GPS Coordinates */}
          {formattedCoordinates && (
            <div className="col-span-full">
              <div className="font-medium">Location</div>
              <div className="flex items-center gap-3">
                <span>{formattedCoordinates}</span>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <GlobeIcon className="h-4 w-4" />
                    <span className="text-xs">View on Maps</span>
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Additional Exif Data - Only if important fields aren't directly provided */}
          {exifData && Object.keys(exifData).length > 0 && (
            <div className="col-span-full mt-4 pt-4 border-t">
              <details className="text-xs">
                <summary className="font-medium cursor-pointer">
                  Additional Exif Data
                </summary>
                <div className="mt-2 bg-muted/50 p-3 rounded-md overflow-x-auto">
                  <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(exifData, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

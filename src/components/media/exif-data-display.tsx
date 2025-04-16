'use client';

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
import { ExternalLinkIcon, GlobeIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import type { Exif } from 'exif-reader';

interface ExifDataDisplayProps {
  exifData: Exif;
  mediaDate?: string | null;
  dimensions?: { width?: number; height?: number } | null;
}

/**
 * Helper function to convert GPS coordinates from DMS format to decimal degrees
 */
function calculateGpsDecimal(
  coordinates: number[] | undefined,
  ref: string | undefined,
): number | undefined {
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
    return undefined;
  }

  // Calculate decimal degrees from degrees, minutes, seconds
  let decimal = coordinates[0] + coordinates[1] / 60 + coordinates[2] / 3600;

  // Apply negative value for South or West references
  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

export default function ExifDataDisplay({
  exifData,
  mediaDate,
  dimensions,
}: ExifDataDisplayProps) {
  // Format the media date if available
  const formattedDate = mediaDate ? format(new Date(mediaDate), 'PPpp') : null;

  // Extract exifData fields using proper Exif type nested properties
  const cameraModel = exifData.Image?.Model
    ? exifData.Image?.Make
      ? `${exifData.Image.Make.toString().trim()} ${exifData.Image.Model.toString().trim()}`
      : exifData.Image.Model.toString().trim()
    : exifData.Image?.Make?.toString().trim();

  const lens =
    exifData.Photo?.LensModel?.toString().trim() ||
    (exifData.Photo?.LensSpecification
      ? `${exifData.Photo.LensSpecification[0]}-${exifData.Photo.LensSpecification[1]}mm f/${exifData.Photo.LensSpecification[2]}-${exifData.Photo.LensSpecification[3]}`
      : null);

  // Use formatExposureInfo utility function instead of manual formatting
  const exposureInfo = formatExposureInfo(exifData);

  // Use formatFocalLength utility function instead of manual formatting
  const focalLength = formatFocalLength(exifData);

  // Format the GPS coordinates if available
  const formattedCoordinates =
    exifData.GPSInfo?.GPSLatitude && exifData.GPSInfo?.GPSLongitude
      ? formatGpsCoordinates(
          calculateGpsDecimal(
            exifData.GPSInfo.GPSLatitude,
            exifData.GPSInfo.GPSLatitudeRef,
          ),
          calculateGpsDecimal(
            exifData.GPSInfo.GPSLongitude,
            exifData.GPSInfo.GPSLongitudeRef,
          ),
        )
      : null;

  // Get Google Maps URL if coordinates are available
  const mapsUrl =
    exifData.GPSInfo?.GPSLatitude && exifData.GPSInfo?.GPSLongitude
      ? getGoogleMapsUrl(
          calculateGpsDecimal(
            exifData.GPSInfo.GPSLatitude,
            exifData.GPSInfo.GPSLatitudeRef,
          ),
          calculateGpsDecimal(
            exifData.GPSInfo.GPSLongitude,
            exifData.GPSInfo.GPSLongitudeRef,
          ),
        )
      : null;

  // Format dimensions
  const formattedDimensions =
    dimensions?.width && dimensions?.height
      ? `${dimensions.width} × ${dimensions.height}`
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

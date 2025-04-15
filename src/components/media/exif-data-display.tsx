'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatGpsCoordinates, getGoogleMapsUrl } from '@/lib/utils';
import type { ExifData } from '@/types';
import { ExternalLinkIcon, GlobeIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';

interface ExifDataDisplayProps {
  // Now we can use our strongly typed ExifData interface
  metadata: ExifData;
  // Direct extracted fields
  mediaDate?: string | null;
  dimensions?: { width?: number; height?: number } | null;
}

export default function ExifDataDisplay({
  metadata,
  mediaDate,
  dimensions,
}: ExifDataDisplayProps) {
  // Format the media date if available
  const formattedDate = mediaDate ? format(new Date(mediaDate), 'PPpp') : null;

  // Extract metadata fields and convert them
  //  - camera
  //  - lens
  //  - exposureInfo
  //  - focalLength
  //  - coordinates
  const camera = metadata.Model;
  const lens = metadata.LensModel;

  const exposureInfo = metadata.ShutterSpeedValue
    ? `ƒ${metadata.ApertureValue} ${metadata.FocalLength} ${metadata.ShutterSpeedValue}`
    : null;
  const focalLength = metadata.FocalLength
    ? `${metadata.FocalLength} mm`
    : null;

  // Format the GPS coordinates if available
  const formattedCoordinates =
    metadata.latitude !== undefined && metadata.longitude !== undefined
      ? formatGpsCoordinates(metadata.latitude, metadata.longitude)
      : null;

  // Get Google Maps URL if coordinates are available
  const mapsUrl = getGoogleMapsUrl(metadata.latitude, metadata.longitude);

  // Format dimensions
  const formattedDimensions =
    dimensions?.width && dimensions?.height
      ? `${dimensions.width} × ${dimensions.height}`
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image Metadata</CardTitle>
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
          {camera && (
            <div>
              <div className="font-medium">Camera</div>
              <div>{camera}</div>
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

          {/* Additional Metadata - Only if important fields aren't directly provided */}
          {metadata && Object.keys(metadata).length > 0 && (
            <div className="col-span-full mt-4 pt-4 border-t">
              <details className="text-xs">
                <summary className="font-medium cursor-pointer">
                  Additional Metadata
                </summary>
                <div className="mt-2 bg-muted/50 p-3 rounded-md overflow-x-auto">
                  <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(metadata, null, 2)}
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

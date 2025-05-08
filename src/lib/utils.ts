import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and tailwind-merge
 * Used by Shadcn UI components
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert GPS coordinates from DMS (Degrees, Minutes, Seconds) to decimal format
 *
 * @param dms - Array of degrees, minutes, seconds
 * @param ref - Reference direction (N, S, E, W)
 * @returns Decimal coordinates or null if invalid
 */
export function convertDMSToDecimal(
  dms: [number, number, number] | number[] | undefined,
  ref: string | undefined,
): number | null {
  if (!dms || dms.length < 3 || !ref) {
    return null;
  }

  // Extract degrees, minutes, seconds
  const [degrees, minutes, seconds] = dms;

  // Convert to decimal
  let decimal = degrees + minutes / 60 + seconds / 3600;

  // Apply negative value for south or west
  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }

  return decimal;
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

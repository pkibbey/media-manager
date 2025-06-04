'use server';

import { promises as fs } from 'node:fs';

interface ParsedDateResult {
  date: Date | null;
  source: 'filename_parsing' | 'file_creation_date' | null;
}

/**
 * Parse dates from various filename formats commonly found in image files
 * If no date is found in the filename, falls back to using the file creation date
 * Returns the parsed date with source information
 */
export async function parseDateFromFilename(
  filePath: string,
): Promise<ParsedDateResult> {
  const filename = filePath.split('/').pop() || '';

  // Common date patterns in filenames (ordered by confidence/specificity)
  const patterns = [
    // YYYY-MM-DD HH:MM:SS patterns (high confidence)
    {
      regex: /(\d{4})[_-](\d{2})[_-](\d{2})[_\s-](\d{2})[_:](\d{2})[_:](\d{2})/,
      confidence: 'high' as const,
      description: 'YYYY-MM-DD HH:MM:SS',
      parser: (match: RegExpMatchArray) =>
        new Date(
          Number.parseInt(match[1]),
          Number.parseInt(match[2]) - 1,
          Number.parseInt(match[3]),
          Number.parseInt(match[4]),
          Number.parseInt(match[5]),
          Number.parseInt(match[6]),
        ),
    },

    // YYYYMMDD_HHMMSS patterns (high confidence)
    {
      regex: /(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/,
      confidence: 'high' as const,
      description: 'YYYYMMDD_HHMMSS',
      parser: (match: RegExpMatchArray) =>
        new Date(
          Number.parseInt(match[1]),
          Number.parseInt(match[2]) - 1,
          Number.parseInt(match[3]),
          Number.parseInt(match[4]),
          Number.parseInt(match[5]),
          Number.parseInt(match[6]),
        ),
    },

    // YYYY-MM-DD patterns (high confidence)
    {
      regex: /(\d{4})[_-](\d{2})[_-](\d{2})/,
      confidence: 'high' as const,
      description: 'YYYY-MM-DD',
      parser: (match: RegExpMatchArray) =>
        new Date(
          Number.parseInt(match[1]),
          Number.parseInt(match[2]) - 1,
          Number.parseInt(match[3]),
        ),
    },

    // YYYYMMDD patterns (high confidence)
    {
      regex: /(\d{4})(\d{2})(\d{2})/,
      confidence: 'high' as const,
      description: 'YYYYMMDD',
      parser: (match: RegExpMatchArray) =>
        new Date(
          Number.parseInt(match[1]),
          Number.parseInt(match[2]) - 1,
          Number.parseInt(match[3]),
        ),
    },

    // IMG_YYYYMMDD patterns (medium confidence)
    {
      regex: /IMG[_-](\d{4})(\d{2})(\d{2})/i,
      confidence: 'medium' as const,
      description: 'IMG_YYYYMMDD',
      parser: (match: RegExpMatchArray) =>
        new Date(
          Number.parseInt(match[1]),
          Number.parseInt(match[2]) - 1,
          Number.parseInt(match[3]),
        ),
    },

    // Photo timestamp patterns like "Photo 2023-12-25" (medium confidence)
    {
      regex: /photo[_\s-](\d{4})[_-](\d{2})[_-](\d{2})/i,
      confidence: 'medium' as const,
      description: 'Photo YYYY-MM-DD',
      parser: (match: RegExpMatchArray) =>
        new Date(
          Number.parseInt(match[1]),
          Number.parseInt(match[2]) - 1,
          Number.parseInt(match[3]),
        ),
    },

    // Screenshot patterns like "Screenshot 2023-12-25" (medium confidence)
    {
      regex: /screenshot[_\s-](\d{4})[_-](\d{2})[_-](\d{2})/i,
      confidence: 'medium' as const,
      description: 'Screenshot YYYY-MM-DD',
      parser: (match: RegExpMatchArray) =>
        new Date(
          Number.parseInt(match[1]),
          Number.parseInt(match[2]) - 1,
          Number.parseInt(match[3]),
        ),
    },
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern.regex);
    if (match) {
      try {
        const date = pattern.parser(match);

        // Validate the parsed date
        if (
          date instanceof Date &&
          !isNaN(date.getTime()) &&
          date.getFullYear() >= 1990 &&
          date.getFullYear() <= new Date().getFullYear() + 1
        ) {
          return {
            date,
            source: 'filename_parsing',
          };
        }
      } catch (_error) {}
    }
  }

  // If no date found in filename, try using file creation date as fallback
  try {
    const stats = await fs.stat(filePath);
    const fileCreationDate = new Date(stats.birthtime);

    // Validate the file creation date
    if (
      fileCreationDate instanceof Date &&
      !isNaN(fileCreationDate.getTime()) &&
      fileCreationDate.getFullYear() >= 1990 &&
      fileCreationDate.getFullYear() <= new Date().getFullYear() + 1
    ) {
      return {
        date: fileCreationDate,
        source: 'file_creation_date',
      };
    }
  } catch (_error) {
    // If file stats cannot be read, continue to return null
  }

  return {
    date: null,
    source: null,
  };
}

'use server';

import {
  fixThumbnailInconsistencies,
  validateThumbnailConsistency,
} from '@/lib/thumbnail-validator';
import type { Action } from '@/types/db-types';

/**
 * Validate thumbnail processing for consistency
 * This checks that thumbnails match their processing states
 */
export async function validateThumbnails(
  limit = 100,
): Action<Awaited<ReturnType<typeof validateThumbnailConsistency>>> {
  try {
    const result = await validateThumbnailConsistency(limit);

    return {
      data: result,
      error: null,
      count: result.totalChecked,
    };
  } catch (_error) {
    return {
      data: null,
      error: null,
      count: null,
    };
  }
}

/**
 * Fix inconsistencies found during thumbnail validation
 */
export async function fixThumbnailIssues(
  mediaIds: string[],
): Action<Awaited<ReturnType<typeof fixThumbnailInconsistencies>>> {
  try {
    const result = await fixThumbnailInconsistencies(mediaIds);

    return {
      data: result,
      error: null,
      count: mediaIds.length,
    };
  } catch (_error) {
    return {
      data: null,
      error: null,
      count: null,
    };
  }
}

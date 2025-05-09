import type { PostgrestResponse } from '@supabase/supabase-js';
import type { Tables } from './supabase';

/**
 * Media filtering options for browsing and searching media
 */
export interface MediaFiltersType {
  search: string;
  type: 'all' | 'image' | 'video' | 'audio' | 'document' | 'other';
  dateFrom: Date | null;
  dateTo: Date | null;
  hasExif: 'all' | 'yes' | 'no';
  hasLocation: 'all' | 'yes' | 'no';
  hasThumbnail: 'all' | 'yes' | 'no';
  hasAnalysis: 'all' | 'yes' | 'no';
  includeHidden: boolean;
  includeDeleted: boolean;
}

/**
 * Media selection state for UI
 */
export interface MediaSelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
}

export type Media = Tables<'media'>;
export type MediaType = Tables<'media_types'>;

export type MediaResponse = Promise<PostgrestResponse<Media>>;

export type MediaWithRelations = Media & {
  media_types: Tables<'media_types'> | null;
  exif_data: Tables<'exif_data'> | null;
  thumbnails: Tables<'thumbnails'> | null;
  analysis_results: Tables<'analysis_results'> | null;
};

export type MediaWithExif = Media & {
  exif_data: Tables<'exif_data'> | null;
};

export type MediaWithRelationsResponse = Promise<
  PostgrestResponse<MediaWithRelations>
>;

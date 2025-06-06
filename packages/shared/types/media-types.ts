import type { PostgrestResponse } from '@supabase/supabase-js';
import type { Database, Tables } from './supabase-types';

export type SpeedProcessingMethod = 'ultra' | 'fast' | 'slow';

export type StandardProcessingMethod = 'standard';
export type OllamaProcessingMethod = 'ollama';
export type DuplicatesProcessingMethod =
  | 'duplicates-only'
  | 'delete-automatically';

export type VisualHashProcessingMethod = 'hash-only';

export type TableName = Extract<keyof Database['public']['Tables'], string>;

export type ProcessType =
  | SpeedProcessingMethod
  | StandardProcessingMethod
  | OllamaProcessingMethod
  | DuplicatesProcessingMethod
  | VisualHashProcessingMethod;

/**
 * Media filtering options for browsing and searching media
 */
export interface MediaFiltersType {
  search: string;
  category: 'all' | 'image' | 'video' | 'audio' | 'application';
  hasExif: 'all' | 'yes' | 'no';
  hasLocation: 'all' | 'yes' | 'no';
  hasThumbnail: 'all' | 'yes' | 'no';
  hasAnalysis: 'all' | 'yes' | 'no';
  thumbnailProcess: ProcessType | 'all';
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

export type MediaWithRelations = Media & {
  media_types: Tables<'media_types'> | null;
  exif_data: Tables<'exif_data'> | null;
  analysis_data: Tables<'analysis_data'> | null;
};

export type MediaWithExif = Media & {
  exif_data: Tables<'exif_data'> | null;
};

export type MediaWithRelationsResponse = Promise<
  PostgrestResponse<MediaWithRelations>
>;

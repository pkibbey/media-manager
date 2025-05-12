'use server';

import { createSupabase } from '@/lib/supabase';
import type { AppSettings, SettingsCategory } from '@/types/settings';

export type UpdateSettingsParams = {
  category: SettingsCategory;
  settings: Partial<AppSettings[SettingsCategory]>;
};

export async function getSettings(): Promise<{
  settings: AppSettings | null;
  error: string | null;
}> {
  try {
    const supabase = createSupabase();

    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to fetch settings: ${error.message}`);
    }

    return {
      settings: data as unknown as AppSettings,
      error: null,
    };
  } catch (e) {
    console.error('Error fetching settings:', e);
    return {
      settings: null,
      error: e instanceof Error ? e.message : 'An unknown error occurred',
    };
  }
}

export async function updateSettings({
  category,
  settings,
}: UpdateSettingsParams): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = createSupabase();

    // First get current settings
    const { data: fetchedData, error: fetchError } = await supabase
      .from('app_settings')
      .select('id, thumbnails, analysis, exif, storage, system')
      .single();

    if (fetchError || !fetchedData) {
      throw new Error(
        `Failed to fetch current settings: ${fetchError?.message || 'Settings record not found.'}`,
      );
    }

    // Assert that fetchedData conforms to AppSettings type
    const currentSettings = fetchedData as AppSettings & {
      id: string;
    };

    // Merge new settings with existing ones
    const updatedSettings = {
      ...currentSettings,
      [category]: {
        ...currentSettings[category],
        ...settings,
      },
    };

    // Update the settings in the database
    const { error: updateError } = await supabase
      .from('app_settings')
      .update(updatedSettings)
      .eq('id', currentSettings.id);

    if (updateError) {
      throw new Error(`Failed to update settings: ${updateError.message}`);
    }

    return {
      success: true,
      error: null,
    };
  } catch (e) {
    console.error('Error updating settings:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'An unknown error occurred',
    };
  }
}

// Get default settings if none exist in the database
export async function getDefaultSettings(): Promise<AppSettings> {
  return {
    thumbnails: {
      quality: 80,
      maxWidth: 1200,
      maxHeight: 1200,
      format: 'webp',
      generateWebP: true,
    },
    analysis: {
      batchSize: 10,
      modelName: 'minicpm-v:latest',
      autoProcessNew: true,
      minConfidenceScore: 0.7,
    },
    exif: {
      batchSize: 20,
      autoProcessNew: true,
      prioritizeGpsData: true,
    },
    storage: {
      mediaPath: '/media',
      thumbnailPath: '/thumbnails',
      maxStorageGB: 100,
      cleanupThresholdPercent: 90,
    },
    system: {
      maxConcurrentJobs: 3,
      notificationsEnabled: true,
      logLevel: 'info',
      adminEmail: '',
    },
  };
}

export type SettingsCategory =
  | 'thumbnails'
  | 'analysis'
  | 'exif'
  | 'storage'
  | 'system';

export type AppSettings = {
  analysis: {
    batchSize: number;
    modelName: string;
    autoProcessNew: boolean;
    minConfidenceScore: number;
  };
  thumbnails: {
    quality: number;
    maxWidth: number;
    maxHeight: number;
    format: 'jpeg' | 'webp' | 'avif';
    generateWebP: boolean;
  };

  exif: {
    batchSize: number;
    autoProcessNew: boolean;
    prioritizeGpsData: boolean;
  };
  storage: {
    mediaPath: string;
    thumbnailPath: string;
    maxStorageGB: number;
    cleanupThresholdPercent: number;
  };
  system: {
    maxConcurrentJobs: number;
    notificationsEnabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    adminEmail: string;
  };
};

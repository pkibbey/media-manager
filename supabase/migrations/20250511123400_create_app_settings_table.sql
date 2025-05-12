-- Create app_settings table for storing application configuration
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) NOT NULL DEFAULT 'settings',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Thumbnail settings
  thumbnails JSONB DEFAULT '{"quality": 80, "maxWidth": 1200, "maxHeight": 1200, "format": "webp", "generateWebP": true}'::JSONB,
  
  -- Analysis settings
  analysis JSONB DEFAULT '{"batchSize": 10, "modelName": "minicpm-v:latest", "autoProcessNew": true, "minConfidenceScore": 0.7}'::JSONB,
  
  -- EXIF processing settings
  exif JSONB DEFAULT '{"batchSize": 20, "autoProcessNew": true, "prioritizeGpsData": true}'::JSONB,
  
  -- Storage settings
  storage JSONB DEFAULT '{"mediaPath": "/media", "thumbnailPath": "/thumbnails", "maxStorageGB": 100, "cleanupThresholdPercent": 90}'::JSONB,
  
  -- System settings
  system JSONB DEFAULT '{"maxConcurrentJobs": 3, "notificationsEnabled": true, "logLevel": "info", "adminEmail": ""}'::JSONB,
  
  -- Ensure we only have one settings record by adding a unique constraint on the key column
  CONSTRAINT unique_settings_record UNIQUE (key)
);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Insert default record
INSERT INTO app_settings DEFAULT VALUES;
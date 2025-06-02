/**
 * Centralized environment variable configuration
 * This ensures consistent environment loading across all packages
 */

import 'dotenv/config';
import * as dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from the root .env.local file
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

// Server-only environment variables (never expose to client)
export const serverEnv = {
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  
  // Media scanning
  MEDIA_SCAN_PATHS: process.env.MEDIA_SCAN_PATHS || '',
  
  // Worker concurrency settings
  OBJECT_DETECTION_WORKER_CONCURRENCY: Number(process.env.OBJECT_DETECTION_WORKER_CONCURRENCY) || 3,
  CONTENT_WARNINGS_WORKER_CONCURRENCY: Number(process.env.CONTENT_WARNINGS_WORKER_CONCURRENCY) || 3,
  ADVANCED_ANALYSIS_WORKER_CONCURRENCY: Number(process.env.ADVANCED_ANALYSIS_WORKER_CONCURRENCY) || 4,
  DUPLICATES_WORKER_CONCURRENCY: Number(process.env.DUPLICATES_WORKER_CONCURRENCY) || 10,
  EXIF_WORKER_CONCURRENCY: Number(process.env.EXIF_WORKER_CONCURRENCY) || 30,
  THUMBNAIL_WORKER_CONCURRENCY: Number(process.env.THUMBNAIL_WORKER_CONCURRENCY) || 20,
} as const;

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_SERVICE_ROLE_KEY'] as const;

for (const envVar of requiredEnvVars) {
  if (!serverEnv[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export type ServerEnv = typeof serverEnv;

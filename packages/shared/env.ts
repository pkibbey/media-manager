/**
 * Centralized environment variable configuration
 * This ensures consistent environment loading across all packages
 */

import 'dotenv/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';

// Load environment variables from the root .env.local file
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

// Environment-specific configuration
export const serverEnv = {
  // Supabase (URL varies by environment, service key is secret)
  SUPABASE_URL: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Redis (host varies by environment, port is standard)
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',

  // Media scanning (paths are environment-specific)
  MEDIA_SCAN_PATHS: process.env.MEDIA_SCAN_PATHS || '',
} as const;

// Application configuration (safe to hardcode)
export const appConfig = {
  // Redis standard port
  REDIS_PORT: 6379,

  // Worker concurrency settings - tuned for optimal performance
  // CPU/GPU intensive workers (lower concurrency to prevent resource contention)
  OBJECT_DETECTION_WORKER_CONCURRENCY: 3,
  CONTENT_WARNINGS_WORKER_CONCURRENCY: 3,
  ADVANCED_ANALYSIS_WORKER_CONCURRENCY: 4,
  THUMBNAIL_WORKER_CONCURRENCY: 6,

  // Mixed workload workers (moderate concurrency)
  DUPLICATES_WORKER_CONCURRENCY: 5,
  FOLDER_SCAN_WORKER_CONCURRENCY: 5,

  // IO intensive workers (higher concurrency for better throughput)
  EXIF_WORKER_CONCURRENCY: 20,
} as const;

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_SERVICE_ROLE_KEY'] as const;

for (const envVar of requiredEnvVars) {
  if (!serverEnv[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export type ServerEnv = typeof serverEnv;
export type AppConfig = typeof appConfig;

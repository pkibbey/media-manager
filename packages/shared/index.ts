/**
 * Re-exports utility functions and common code used across workers
 */

// Configure dotenv for workers
import 'dotenv/config';
import * as dotenv from 'dotenv';

// Load the main .env.local file from the root
dotenv.config({ path: '../../.env.local' });

export * from './supabase';
export * from '../../src/types/supabase';
export * from '../../src/types/media-types';
export * from '../../src/types/scan-types';

import IORedis from 'ioredis';
import { appConfig, serverEnv } from './env';

/**
 * Create a standardized Redis connection for the application
 */
export function createRedisConnection(): IORedis {
  return new IORedis(appConfig.REDIS_PORT, serverEnv.REDIS_HOST, {
    maxRetriesPerRequest: null, // Disable retries to avoid hanging jobs
  });
}

import { Redis, type RedisOptions } from 'ioredis';

const options: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
};

const redis = new Redis(
  Number(process.env.REDIS_PORT) || 6379,
  process.env.REDIS_HOST || 'localhost',
  options,
);

export { redis };

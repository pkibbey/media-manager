import { workers } from '@/lib/workers';

console.log('Starting BullMQ workers...');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down workers...');

  await Promise.all(workers.map((worker) => worker.close()));

  console.log('Workers shut down gracefully');
  process.exit(0);
});

console.log(`Started ${workers.length} workers`);

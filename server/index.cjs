const Fastify = require('fastify');
const analysisBasicHandler = require('./handlers/analysisBasic.cjs');

// Fastify server with Pino logger
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok' };
});

// Analysis endpoints
fastify.register(async (analysisScope) => {
  analysisScope.post('/analysis/basic', analysisBasicHandler);

  analysisScope.post('/analysis/advanced', async (_request, _reply) => {
    // TODO: Implement advanced analysis logic
    return { result: 'Advanced analysis complete' };
  });

  analysisScope.post('/analysis/faces', async (_request, _reply) => {
    // TODO: Implement face detection logic
    return { result: 'Face detection complete' };
  });

  analysisScope.post('/analysis/objects', async (_request, _reply) => {
    // TODO: Implement object detection logic
    return { result: 'Object detection complete' };
  });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 4000, host: '0.0.0.0' });
    console.log('Fastify server running on http://localhost:4000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

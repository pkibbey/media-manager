# Media Manager

A powerful media management system with automatic processing features.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the required values:
   ```bash
   cp .env.example .env.local
   ```

3. Run the Next.js development server:
   ```bash
   npm run dev
   ```

## Workers

This project uses multiple workers for media processing:
- thumbnails: Generate thumbnails for media files
- exif: Extract EXIF metadata from images and videos
- duplicates: Detect duplicate media files
- content-warnings: Detect potentially sensitive content
- object-detection: Detect objects in media files
- advanced: Process media using advanced AI analysis

To run all workers:

```bash
npm run workers
```

Workers depend on Redis being available at the configured host/port.

## Troubleshooting Workers

If workers are not running properly:

1. Make sure Redis is running:
   ```bash
   brew services info redis
   # or
   docker ps | grep redis
   ```

2. Check that your `.env.local` file has the correct Redis configuration:
   ```
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

3. Ensure the shared package is properly linked:
   ```bash
   npm install
   ```

4. Run workers with verbose logging:
   ```bash
   DEBUG=worker:* npm run workers
   ```

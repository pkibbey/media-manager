/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['localhost'],
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      new URL('http://127.0.0.1:54321/storage/v1/object/public/thumbnails/**'),
    ],
  },
  serverExternalPackages: ['bullmq'],
  // Enable experimental features for server actions
  experimental: {
    serverComponentsHmrCache: false,
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      new URL(
        'http://127.0.0.1:54321/storage/v1/object/public/thumbnails/thumbnails/**',
      ),
    ],
  },
  // Enable experimental features for server actions
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
      // The experimental serverComponentsHmrCache option allows you to
      // cache fetch responses in Server Components across Hot Module
      // Replacement (HMR) refreshes in local development. This results
      // in faster responses and reduced costs for billed API calls.
      // serverComponentsHmrCache: false,
    },
  },
};

module.exports = nextConfig;

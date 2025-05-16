/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['localhost', '192.168.1.170', 'image-server'],
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      new URL('http://127.0.0.1:54321/storage/v1/object/public/thumbnails/**'),
    ],
  },
  // Enable experimental features for server actions
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost', '192.168.1.170', 'image-server'],
    },
    serverComponentsHmrCache: false,
  },
};

module.exports = nextConfig;

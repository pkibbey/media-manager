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
  // Configure TensorFlow.js usage in Next.js
  webpack: (config, { isServer }) => {
    // Handle TensorFlow.js Node native modules
    if (isServer) {
      config.externals = [
        ...config.externals,
        '@tensorflow/tfjs-node',
        'canvas',
        'sharp',
      ];
    }

    return config;
  },
};

module.exports = nextConfig;

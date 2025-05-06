/** @type {import('next').NextConfig} */
const nextConfig = {
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
      allowedOrigins: ['localhost:3000'],
    },
    serverComponentsHmrCache: false,
  },
  // Webpack configuration to properly handle TensorFlow.js native modules
  webpack: (config, { isServer }) => {
    // Only apply this configuration for server-side code
    if (isServer) {
      // Mark these packages as external, so Next.js won't try to bundle them
      config.externals = [
        ...(config.externals || []),
        '@tensorflow/tfjs-node',
        '@mapbox/node-pre-gyp',
        'node-pre-gyp',
      ];
    }

    return config;
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['localhost', process.env.OLLAMA_HOST],
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
      allowedOrigins: ['localhost', process.env.OLLAMA_HOST],
    },
    serverComponentsHmrCache: false,
  },
  // Configure TensorFlow.js usage in Next.js
  webpack: (config, { isServer }) => {
    // Handle TensorFlow.js Node native modules
    if (isServer) {
      config.externals = [
        ...config.externals,
        '@tensorflow/tfjs-node-gpu',
        'canvas',
        'sharp',
      ];
    }

    return config;
  },
};

module.exports = nextConfig;

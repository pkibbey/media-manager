/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,
	// Enable experimental features for server actions
	experimental: {
		serverActions: {
			allowedOrigins: ["localhost:3000"],
		},
	},
};

module.exports = nextConfig;

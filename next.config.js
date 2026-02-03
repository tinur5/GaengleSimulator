/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Generate a unique build ID to bust cache on every deployment
  generateBuildId: async () => {
    // Use timestamp to ensure fresh builds
    return `build-${Date.now()}`;
  },
  // Add headers to prevent aggressive caching in production
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

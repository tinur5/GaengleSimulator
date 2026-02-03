/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Generate a unique build ID based on git commit or timestamp for cache busting
  generateBuildId: async () => {
    // In Vercel, VERCEL_GIT_COMMIT_SHA is available
    // Otherwise fall back to timestamp for local builds
    return process.env.VERCEL_GIT_COMMIT_SHA || `build-${Date.now()}`;
  },
  // Add headers only for HTML pages to prevent aggressive caching
  async headers() {
    return [
      {
        // Only apply to dashboard and main pages (HTML), not static assets
        source: '/(.*)\\.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Apply to main routes
        source: '/:path((?!_next|static).*)',
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

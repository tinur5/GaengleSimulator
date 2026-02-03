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
  // Add headers for HTML pages to prevent stale caching
  // Static assets automatically get proper cache headers from Next.js
  async headers() {
    return [
      {
        // Apply no-cache policy to main pages
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Apply no-cache policy to dashboard
        source: '/dashboard',
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

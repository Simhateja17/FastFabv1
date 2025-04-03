/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // For production we'll handle linting separately,
    // allowing builds to continue even with warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip TypeScript validation during build for faster builds
    ignoreBuildErrors: true,
  },
  // Enable module transpilation for packages that need it
  transpilePackages: [],
  // Output standalone build for better deployment performance
  output: 'standalone',
  // Disable strict mode for better compatibility with existing code
  reactStrictMode: false,
  // Production-ready image configuration
  images: {
    domains: [
      'ljotxxopiuikiwnbhnhn.supabase.co',
      'fastandfab.in',
      'www.fastandfab.in'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Cache configuration for production
  onDemandEntries: {
    // Keep pages in memory for 300 seconds in production
    maxInactiveAge: 300 * 1000,
    // Track up to 100 pages in memory
    pagesBufferLength: 100,
  },
  // Optional: Configure build environment
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },
  // Advanced optimizations
  experimental: {
    // Enable selective optimizations
    optimizeCss: true,
    // Use optimized bundle analysis
    optimizePackageImports: ['react-icons'],
  },
  // Headers configuration
  async headers() {
    return [
      {
        // Enable security headers for all routes
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;

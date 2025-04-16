/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["ljotxxopiuikiwnbhnhn.supabase.co"],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://fastandfab.in/api/:path*',
      },
    ]
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["ljotxxopiuikiwnbhnhn.supabase.co"],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL 
          ? `${process.env.NEXT_PUBLIC_API_URL}/:path*` 
          : 'http://localhost:8000/api/:path*',
      },
    ]
  },
};

export default nextConfig;

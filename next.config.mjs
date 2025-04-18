/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['images.unsplash.com', 'fastapi-pro.s3.amazonaws.com'],
  },
  // Expose specific environment variables to the client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    NEXT_PUBLIC_SELLER_SERVICE_URL: process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || 'http://localhost:8000/api',
    NEXT_PUBLIC_CASHFREE_MODE: process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },
};

export default nextConfig;

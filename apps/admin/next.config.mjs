/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@eventor/ui', '@eventor/types', '@eventor/supabase'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;

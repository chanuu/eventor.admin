/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a verification build run without overwriting the dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  transpilePackages: ['@eventor/ui', '@eventor/types', '@eventor/supabase'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;

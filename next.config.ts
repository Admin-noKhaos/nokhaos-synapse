import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
      { protocol: 'https', hostname: 'scontent-*.cdninstagram.com' },
    ],
  },
};

export default config;

import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '..'),
  serverExternalPackages: ['pg'],
  turbopack: {
    root: path.join(process.cwd(), '..'),
  },
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [{
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};
export default nextConfig;

import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), '..'),
  serverExternalPackages: ['pg'],
  turbopack: {
    root: path.join(process.cwd(), '..'),
    resolveAlias: {
      '@nestjs/common': './web/node_modules/@nestjs/common',
      pg: './web/node_modules/pg',
    },
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

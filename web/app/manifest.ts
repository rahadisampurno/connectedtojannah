import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Connected to Jannah',
    short_name: 'CTJ',
    description: 'Bersama di dunia, menuju Jannah.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D2A4A',
    theme_color: '#0D2A4A',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  };
}

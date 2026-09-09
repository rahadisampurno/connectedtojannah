import type { Metadata, Viewport } from 'next';
import './styles.css';
import './product-v1.css';
import './product-v2.css';
export const metadata: Metadata = {
  title: { default: 'Connected to Jannah', template: '%s · Connected to Jannah' },
  description: 'Social worship companion dan shared spiritual journey untuk diri sendiri, keluarga, sahabat, kajian, dan komunitas.',
  keywords: ['amalan harian', 'Muslim habit companion', 'ibadah bersama', 'Circle keluarga', 'Journey World'],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  openGraph: { title: 'Connected to Jannah', description: 'Bersama di dunia, menuju Jannah.', type: 'website', locale: 'id_ID' }
};
export const viewport: Viewport = { width:'device-width', initialScale:1, viewportFit:'cover', themeColor:'#0D2A4A' };
import { ConfirmDialogProvider } from '../components/confirm-dialog';

export default function RootLayout({children}:{children:React.ReactNode}) {
  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ConfirmDialogProvider>
          {children}
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import { CartProvider } from '@/lib/cart';
export const metadata: Metadata = {
  title: 'Wasalni — Livraison à Sidi Bouzid',
  description: 'Livraison de vos plats préférés à Sidi Bouzid : restaurants, fast-food, cafés et pâtisseries.',
  manifest: '/manifest.json',
};
export const viewport: Viewport = { themeColor: '#FFC244' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="fr"><head>
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/icon.svg" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="theme-color" content="#FFC244" />
  </head><body>
    <CartProvider><Header /><main className="min-h-[60vh]">{children}</main><Footer /><BottomNav /></CartProvider>
  </body></html>);
}

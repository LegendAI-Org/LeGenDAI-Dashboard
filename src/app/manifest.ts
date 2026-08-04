import type { MetadataRoute } from 'next';

// Makes the dashboard installable ("add to home screen") on Android and iOS.
// display: standalone opens it full-screen without the browser chrome, like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Noga CRM',
    short_name: 'Noga CRM',
    description: 'דאשבורד לידים ושיחות — בית ספר עוגן',
    start_url: '/conversations',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    dir: 'rtl',
    lang: 'he',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

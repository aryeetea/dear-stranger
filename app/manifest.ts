import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dear Stranger',
    short_name: 'Dear Stranger',
    description: 'A universe of slow letters',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#04050f',
    theme_color: '#04050f',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon?size=192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon?size=512',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}

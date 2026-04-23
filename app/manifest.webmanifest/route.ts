export function GET() {
  return Response.json({
    id: '/',
    name: 'Dear Stranger',
    short_name: 'Dear Stranger',
    description: 'A universe of slow, anonymous letters - write to strangers, drift through the cosmos, and be found.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#06040e',
    theme_color: '#06040e',
    orientation: 'portrait',
    lang: 'en',
    categories: ['social', 'lifestyle', 'entertainment'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icon?size=192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Write a Letter',
        short_name: 'Write',
        description: 'Compose a new letter to a stranger',
        url: '/?action=write',
        icons: [{ src: '/icon?size=192', sizes: '192x192' }],
      },
      {
        name: 'Observatory',
        short_name: 'Letters',
        description: 'Read letters in transit and arrived',
        url: '/?action=observatory',
        icons: [{ src: '/icon?size=192', sizes: '192x192' }],
      },
    ],
  })
}

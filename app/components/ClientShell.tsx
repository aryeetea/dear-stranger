'use client'

import dynamic from 'next/dynamic'

const ServiceWorkerRegister = dynamic(() => import('./ServiceWorkerRegister'), { ssr: false })
const FontSizeControls = dynamic(() => import('./FontSizeControls'), { ssr: false })
const CursorTrail = dynamic(() => import('./CursorTrail'), { ssr: false })
const CosmicBackground = dynamic(() => import('./CosmicBackground'), { ssr: false })
const AppInstallPrompt = dynamic(() => import('./AppInstallPrompt'), { ssr: false })

export default function ClientShell() {
  return (
    <>
      <CosmicBackground />
      <CursorTrail />
      <AppInstallPrompt />
      <FontSizeControls />
      <ServiceWorkerRegister />
    </>
  )
}

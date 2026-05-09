'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandalone() {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIosSafari() {
  if (typeof window === 'undefined') return false

  const ua = window.navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isWebkit = /WebKit/.test(ua)
  const isOtherBrowser = /CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)

  return isIos && isWebkit && !isOtherBrowser
}

export default function AppInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('ds_install_prompt_dismissed') === '1'
  })
  const [showIosHint, setShowIosHint] = useState(() => {
    if (typeof window === 'undefined') return false
    return !isStandalone() && isIosSafari() && localStorage.getItem('ds_install_prompt_dismissed') !== '1'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone()) return
    if (localStorage.getItem('ds_install_prompt_dismissed') === '1') return

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setDeferredPrompt(null)
      setShowIosHint(false)
      setDismissed(true)
      localStorage.removeItem('ds_install_prompt_dismissed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (dismissed || isStandalone()) return null
  if (!deferredPrompt && !showIosHint) return null

  async function install() {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setDismissed(true)
      localStorage.removeItem('ds_install_prompt_dismissed')
    }
    setDeferredPrompt(null)
  }

  function dismiss() {
    setDismissed(true)
    localStorage.setItem('ds_install_prompt_dismissed', '1')
  }

  return (
    <div className="app-install-prompt">
      <div className="app-install-copy">
        <strong>Bring Dear Stranger to your home screen.</strong>
        <span>
          {deferredPrompt
            ? 'Install it for a full-screen, app-like experience.'
            : 'In Safari, tap Share and choose Add to Home Screen.'}
        </span>
      </div>
      <div className="app-install-actions">
        {deferredPrompt ? (
          <button type="button" className="app-install-primary" onClick={install}>
            Install
          </button>
        ) : null}
        <button type="button" className="app-install-dismiss" onClick={dismiss} aria-label="Dismiss install prompt">
          Not now
        </button>
      </div>
    </div>
  )
}

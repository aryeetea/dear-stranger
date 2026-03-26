'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playChime } from '../../lib/sounds'

const STORAGE_KEY = 'ds_notif_dismissed'

/** Send a local notification via the registered service worker. */
export async function sendLocalNotification(title: string, body: string): Promise<void> {
  if (typeof window === 'undefined') return
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(title, {
      body,
      icon: '/icon?size=192',
      badge: '/icon?size=192',
      data: { url: '/' },
    } as NotificationOptions)
    playChime()
  } catch {
    // Silently ignore if notifications are unavailable
  }
}

/** Subtle banner that asks for notification permission once. */
export default function NotificationBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem(STORAGE_KEY)) return

    // Show after a short delay so it doesn't interrupt the entrance
    const timer = setTimeout(() => setVisible(true), 4000)
    return () => clearTimeout(timer)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  async function enable() {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      playChime()
    }
    dismiss()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="notif-banner"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(6,4,20,0.92)',
            border: '1px solid rgba(201,168,76,0.28)',
            borderRadius: '999px',
            padding: '10px 18px 10px 16px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 0 32px rgba(201,168,76,0.1)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '14px' }}>✦</span>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '13px',
            color: 'rgba(220,200,160,0.9)',
            letterSpacing: '0.02em',
          }}>
            Be notified when letters arrive
          </span>
          <button
            onClick={enable}
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '10px',
              letterSpacing: '0.12em',
              color: 'rgba(201,168,76,0.95)',
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '999px',
              padding: '5px 14px',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Enable
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(180,160,120,0.5)',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

'use client'

import { useEffect, useState } from 'react'

function readViewport() {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 }
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

export function useViewport() {
  const [{ width, height }, setViewport] = useState(readViewport)

  useEffect(() => {
    const updateViewport = () => {
      setViewport(readViewport())
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
    }
  }, [])

  return {
    width,
    height,
    isMobile: width < 768,
    isTablet: width < 1100,
    isNarrow: width < 480,
    isShort: height < 760,
  }
}

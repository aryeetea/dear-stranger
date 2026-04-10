import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
// ...other imports (keep your existing imports here)


type Screen = 'loading' | 'landing' | 'entry' | 'onboarding' | 'universe' | 'generating' | 'confirm_email';

export default function Home() {
  // State and refs
  const [screen, setScreen] = useState<Screen>('loading');
  const screenRef = useRef<Screen>('loading');
  const [pendingCredentials, setPendingCredentials] = useState<any>(null);
  const [onboardingError, setOnboardingError] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false);
  const [savedOverlay, setSavedOverlay] = useState<any>(null);

  // Keep screenRef in sync
  useEffect(() => { screenRef.current = screen; }, [screen]);

  // Dummy implementations for demo (replace with your real logic)
  const clearHubState = useCallback(() => {
    // Clear all relevant state here
    setPendingCredentials(null);
    setOnboardingError('');
    setIsGuest(false);
    setGuestBannerDismissed(false);
    setSavedOverlay(null);
  }, []);

  // Dummy routeFromSession (replace with your real logic)
  const routeFromSession = useCallback(async () => {
    // Simulate session routing logic
    // In real app, check session and setScreen accordingly
    setScreen('landing');
  }, []);

  useEffect(() => {
    let ignore = false;
    let fallbackTimer: NodeJS.Timeout | null = null;

    async function checkSession() {
      try {
        await routeFromSession();
      } catch (err) {
        console.error('checkSession failed:', err);
        clearHubState();
        setScreen('landing');
      } finally {
        if (fallbackTimer) clearTimeout(fallbackTimer);
      }
    }

    checkSession();

    fallbackTimer = setTimeout(() => {
      if (screenRef.current === 'loading') {
        clearHubState();
        setScreen('landing');
        console.log('[fallbackTimer] loading >18s, go to landing');
      }
    }, 18000);

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: string) => {
      if (ignore) return;
      console.log('[authStateChange]', event);
      if (event === 'SIGNED_OUT') {
        clearHubState();
        setPendingCredentials(null);
        setOnboardingError('');
        setIsGuest(false);
        setGuestBannerDismissed(false);
        setSavedOverlay(null);
        setScreen('landing');
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await routeFromSession();
      }
    });

    return () => {
      ignore = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ...rest of your Home component
  return (
    <div>
      {/* Render your app screens here based on 'screen' state */}
      <div>Current screen: {screen}</div>
      {onboardingError && <div style={{color:'red'}}>{onboardingError}</div>}
    </div>
  );
}
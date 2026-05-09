export type UniverseOverlay = 'observatory' | 'profile' | 'drift' | 'pages' | null

export const APP_SHELL_KEYS = {
  authFlow: 'ds_auth_flow',
  lastOverlay: 'ds_last_overlay',
  onboardingDraft: 'ds_onboarding_draft',
  pendingCreds: 'ds_pending_creds',
  routeToOnboarding: 'ds_goto_onboarding',
} as const

export const APP_SHELL_TIMEOUTS = {
  appLoadingSlowMs: 3500,
  hubFetchTimeoutMs: 7000,
  pendingAvatarRetryInitialDelayMs: 15000,
  pendingAvatarRetryIntervalMs: 5 * 60 * 1000,
  sessionTimeoutMs: 8000,
} as const

export function shouldShowWelcomePage() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('welcome') === '1'
}

export function readSavedOverlay(): UniverseOverlay {
  if (typeof window === 'undefined') return null

  const saved = localStorage.getItem(APP_SHELL_KEYS.lastOverlay)
  return saved === 'observatory' || saved === 'profile' || saved === 'drift' || saved === 'pages'
    ? saved
    : null
}

export function writeSavedOverlay(overlay: UniverseOverlay) {
  if (typeof window === 'undefined') return

  if (overlay) localStorage.setItem(APP_SHELL_KEYS.lastOverlay, overlay)
  else localStorage.removeItem(APP_SHELL_KEYS.lastOverlay)
}

export function clearOnboardingIntent() {
  if (typeof sessionStorage === 'undefined') return

  sessionStorage.removeItem(APP_SHELL_KEYS.routeToOnboarding)
  sessionStorage.removeItem(APP_SHELL_KEYS.pendingCreds)
  sessionStorage.removeItem(APP_SHELL_KEYS.authFlow)
}

export function getAuthFlow() {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem(APP_SHELL_KEYS.authFlow)
}

export function hasSignupOnboardingIntent() {
  if (typeof sessionStorage === 'undefined') return false

  return (
    sessionStorage.getItem(APP_SHELL_KEYS.routeToOnboarding) === '1' &&
    sessionStorage.getItem(APP_SHELL_KEYS.authFlow) === 'signup'
  )
}

export function readPendingCredentials() {
  if (typeof sessionStorage === 'undefined') return null

  const raw = sessionStorage.getItem(APP_SHELL_KEYS.pendingCreds)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as { email?: unknown; password?: unknown }
    if (typeof parsed.email !== 'string' || typeof parsed.password !== 'string') return null
    return { email: parsed.email, password: parsed.password }
  } catch {
    return null
  }
}

export function clearOnboardingDraft() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(APP_SHELL_KEYS.onboardingDraft)
}

export function readOnboardingDraft<T>() {
  if (typeof sessionStorage === 'undefined') return null

  const raw = sessionStorage.getItem(APP_SHELL_KEYS.onboardingDraft)
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeOnboardingDraft(value: unknown) {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(APP_SHELL_KEYS.onboardingDraft, JSON.stringify(value))
}

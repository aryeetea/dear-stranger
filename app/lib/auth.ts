import { supabase } from '../../lib/supabase'
import type { HandwritingStyle, EmbellishmentId } from '../lib/letterEnrichments'

const MAX_HUB_NAME_LEN = 32
const MAX_BIO_LEN = 300
const MAX_ASK_LEN = 200

type HubRecord = {
  id: string
  hub_name: string | null
  bio?: string | null
  ask_about?: string | null
  avatar_url?: string | null
  avatar_prompt_pending?: string | null
  hub_style?: string | null
  backdrop_id?: string | null
  decoration?: string | null
  glow_intensity?: string | null
  regen_count?: number | null
  letters_sent?: number | null
  visitor_book_enabled?: boolean | null
  email?: string | null
  created_at?: string | null
  online?: boolean | null
}

type LetterRecord = {
  id: string
  sender_id: string
  recipient_id: string | null
  body: string | null
  subject: string | null
  created_at: string
  status: string | null
  arrives_at: string | null
  is_universe_letter?: boolean | null
  sender?: { hub_name?: string | null } | null
  recipient?: { hub_name?: string | null } | null
  envelope_id?: string | null
  handwriting_style?: string | null
  embellishment_id?: string | null
}

type UniverseLetterRow = {
  id: string
  sender_id?: string | null
  body?: string | null
  subject?: string | null
  paper_id?: string | null
  font_id?: string | null
  font_color?: string | null
  paper_color?: string | null
  handwriting_style?: string | null
  handwritten_image_url?: string | null
  embellishment_id?: string | null
  created_at?: string | null
  is_anonymous?: boolean | null
  sender?: { hub_name?: string | null } | null
}

type VisitorBookRow = {
  id: string
  visitor_id?: string | null
  visited_at: string
  visitor?: { hub_name?: string | null; avatar_url?: string | null } | null
}

type ReturnPathRow = {
  sender?: { hub_name?: string | null } | null
  recipient?: { hub_name?: string | null } | null
}

export type VisitorBookEntry = {
  id: string
  visitorId: string
  visitorName: string
  avatarUrl?: string
  visitedAt: string
}

type AvatarHistoryRow = {
  id: string
  user_id: string
  image_url: string
  created_at: string
}

export type AvatarHistoryEntry = {
  id: string
  imageUrl: string
  createdAt: string
}

function normalizeHubName(hubName: string) {
  return hubName.trim().toLowerCase()
}

async function assertHubNameAvailable(hubName: string, excludeUserId?: string) {
  const normalized = normalizeHubName(hubName)
  if (!normalized) throw new Error('Hub name is required.')
  if (normalized.length > MAX_HUB_NAME_LEN) throw new Error(`Hub name must be ${MAX_HUB_NAME_LEN} characters or fewer.`)

  const { data, error } = await supabase
    .from('hubs')
    .select('id, hub_name')
    .ilike('hub_name', normalized)
    .limit(10)

  if (error) throw error

  const existing = (data || []).find((hub: { id: string; hub_name: string | null }) => {
    if (excludeUserId && hub.id === excludeUserId) return false
    return normalizeHubName(hub.hub_name || '') === normalized
  })

  if (existing) throw new Error('That hub name is already taken. Choose another one.')
}

export async function isHubNameAvailable(hubName: string, excludeUserId?: string) {
  try {
    await assertHubNameAvailable(hubName, excludeUserId)
    return true
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'That hub name is already taken. Choose another one.'
    ) {
      return false
    }
    throw error
  }
}

export async function signUpAndCreateHub(
  email: string,
  password: string,
  hubName: string,
  bio: string,
  askAbout: string,
  hubStyle?: string,
  backdropId?: string,
  decoration?: string,
) {
  if (bio.length > MAX_BIO_LEN) throw new Error(`Bio must be ${MAX_BIO_LEN} characters or fewer.`)
  if (askAbout.length > MAX_ASK_LEN) throw new Error(`Ask about must be ${MAX_ASK_LEN} characters or fewer.`)
  await assertHubNameAvailable(hubName)

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('Signup limit reached. Please try again in an hour, or contact support.')

  if (!authData.session) {
    throw new Error('PLEASE_CONFIRM_EMAIL')
  }

  const { error: hubError } = await supabase.from('hubs').insert([
    {
      id: authData.user.id,
      hub_name: hubName,
      bio,
      ask_about: askAbout,
      email,
      hub_style: hubStyle || 'portal',
      backdrop_id: backdropId || 'gold',
      decoration: decoration || 'none',
      visitor_book_enabled: true,
    },
  ])

  if (hubError) throw hubError
  return authData.user
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })
  if (error) throw error
  if (typeof window !== 'undefined' && data.url) window.location.assign(data.url)
}

export async function signInWithDiscord() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      skipBrowserRedirect: true,
    },
  })
  if (error) throw error
  if (typeof window !== 'undefined' && data.url) window.location.assign(data.url)
}

export async function sendEmailCode(email: string, shouldCreateUser = false) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser,
    },
  })
  if (error) throw error
}

export async function verifyEmailCode(
  email: string,
  token: string,
  type: 'email' | 'signup' = 'email',
) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  })
  if (error) throw error
  return data
}

export async function createHubForCurrentUser(
  hubName: string,
  bio: string,
  askAbout: string,
  hubStyle?: string,
  backdropId?: string,
  decoration?: string,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('No authenticated user found')

  const { data: existingHub, error: existingHubError } = await supabase
    .from('hubs')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existingHubError) throw existingHubError
  if (existingHub) return existingHub

  await assertHubNameAvailable(hubName, user.id)

  const email = user.email || null

  const { data, error } = await supabase
    .from('hubs')
    .insert([
      {
        id: user.id,
        hub_name: hubName,
        bio,
        ask_about: askAbout,
        email,
        hub_style: hubStyle || 'portal',
        backdrop_id: backdropId || 'gold',
        decoration: decoration || 'none',
        visitor_book_enabled: true,
      },
    ])
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error('Hub could not be created.')

  return data
}

export async function createFallbackHubForCurrentUser() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('No authenticated user found')

  const fallbackHubName = `Stranger ${user.id.slice(0, 8)}`
  const fallbackBio = 'A wanderer who arrived here quietly, carrying something unspoken.'
  const fallbackAsk = 'Silence, slow mornings, and letters that take their time.'

  return createHubForCurrentUser(fallbackHubName, fallbackBio, fallbackAsk)
}

export async function signInAndCreateHub(hubName: string, bio: string, askAbout: string) {
  await assertHubNameAvailable(hubName)

  const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
  if (authError) throw authError
  if (!authData.user) throw new Error('No user returned')

  const { error: hubError } = await supabase.from('hubs').insert([
    {
      id: authData.user.id,
      hub_name: hubName,
      bio,
      ask_about: askAbout,
      visitor_book_enabled: true,
    },
  ])

  if (hubError) throw hubError
  return authData.user
}

export async function signOut() {
  let hasSession = false

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user
    hasSession = Boolean(session)

    if (user) {
      const { error } = await supabase.from('hubs').update({ online: false }).eq('id', user.id)
      if (error) console.warn('Failed to mark hub offline before sign out:', error)
    }
  } catch (err) {
    console.warn('Unable to update hub before sign out:', err)
  }

  if (!hasSession) return

  const { error } = await supabase.auth.signOut()
  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('session') && message.includes('missing')) return
    console.error('signOut failed:', error)
    throw error
  }
}

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error('No user found')

    const userId = user.id

    const withDeleteTimeout = async (label: string, task: PromiseLike<unknown>) => {
      await Promise.race([
        task,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timeout`)), 8000),
        ),
      ]).catch((err: unknown) => {
        console.warn(
          `${label} skipped:`,
          err instanceof Error ? err.message : String(err),
        )
      })
    }

    await Promise.allSettled([
      withDeleteTimeout(
        'Letters deletion',
        supabase.from('letters').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
      ),
      withDeleteTimeout(
        'Hub visits deletion',
        supabase.from('hub_visits').delete().or(`hub_id.eq.${userId},visitor_id.eq.${userId}`),
      ),
    ])

    const { error: hubError } = await supabase.from('hubs').delete().eq('id', userId)
    if (hubError) throw new Error(`Hub delete failed: ${hubError.message}`)

    await signOut()

    return { success: true }
  } catch (err: unknown) {
    console.error('deleteAccount failed:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Delete failed',
    }
  }
}

export async function exportMyLetters(): Promise<string> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('No user')

    const { data, error } = await supabase
      .from('letters')
      .select('*, sender:sender_id(hub_name), recipient:recipient_id(hub_name)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    if (error) throw error

    const letters = (data || []) as LetterRecord[]

    const lines: string[] = [
      'DEAR STRANGER — Letter Archive',
      `Exported: ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`,
      `Total letters: ${letters.length}`,
      '',
      '═'.repeat(60),
      '',
    ]

    letters.forEach((l, i) => {
      const direction = l.sender_id === user.id ? 'SENT' : 'RECEIVED'
      const other =
        direction === 'SENT'
          ? l.recipient?.hub_name || (l.is_universe_letter ? 'The Universe' : 'Unknown')
          : l.sender?.hub_name || 'Unknown'

      const date = new Date(l.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      lines.push(`Letter ${i + 1} · ${direction}`)
      lines.push(`${direction === 'SENT' ? 'To' : 'From'}: ${other}`)
      lines.push(`Date: ${date}`)
      if (l.subject && l.subject !== 'A letter for you') lines.push(`Subject: ${l.subject}`)
      lines.push('')
      lines.push(l.body || '')
      lines.push('')
      lines.push('─'.repeat(40))
      lines.push('')
    })

    return lines.join('\n')
  } catch (err) {
    console.error('exportMyLetters failed:', err)
    return 'Export failed.'
  }
}

export async function getPages(limit = 60) {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('id, body, type, resonance_count, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return []
    return (data || []) as { id: string; body: string; type: 'entry' | 'poem'; resonance_count: number; created_at: string }[]
  } catch {
    return []
  }
}

export async function submitPage(body: string, type: 'entry' | 'poem') {
  const { error } = await supabase.from('pages').insert({ body: body.trim(), type })
  if (error) throw new Error(error.message)
}

export async function resonatePage(id: string) {
  const { error } = await supabase.rpc('increment_page_resonance', { page_id: id })
  if (error) throw new Error(error.message)
}

const DRIFT_PAPER_IDS = ['void-parchment','nebula-leaf','starworn','moondust','ember-glow','tide-glass','rose-ash','gilded-dark']
const DRIFT_PAPER_FILTER = `("${DRIFT_PAPER_IDS.join('","')}")`
const UNIVERSE_LETTER_TTL_DAYS = 7

export async function getUniverseLetters() {
  try {
    const cutoff = new Date(Date.now() - UNIVERSE_LETTER_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('letters')
      .select('id, sender_id, body, subject, paper_id, font_id, font_color, paper_color, handwriting_style, handwritten_image_url, embellishment_id, is_anonymous, sender:sender_id(hub_name)')
      .eq('is_universe_letter', true)
      .eq('status', 'arrived')
      .gte('created_at', cutoff)
      .not('paper_id', 'in', DRIFT_PAPER_FILTER)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return []

    return ((data || []) as UniverseLetterRow[]).map((l) => ({
      id: l.id,
      senderId: (l.sender_id as string) || '',
      senderName: l.is_anonymous ? 'A Stranger' : (l.sender?.hub_name || 'A Stranger'),
      body: (l.body as string) || '',
      preview: l.body ? (l.body.length > 80 ? `${l.body.slice(0, 80)}...` : l.body) : '',
      subject: l.subject || 'A letter for you',
      paperId: (l.paper_id as string) || 'void-parchment',
      fontId: (l.font_id as string) || 'im-fell',
      fontColor: (l.font_color as string) || undefined,
      paperColor: (l.paper_color as string) || undefined,
      handwritingStyle: (l.handwriting_style as string) || 'typed',
      handwrittenImageUrl: (l.handwritten_image_url as string) || undefined,
      embellishmentId: (l.embellishment_id as string) || 'none',
    }))
  } catch {
    return []
  }
}

export async function getDriftLetters() {
  try {
    const blockedIds = await getBlockedIds()

    let query = supabase
      .from('letters')
      .select('id, sender_id, body, subject, paper_id, font_id, font_color, handwriting_style, handwritten_image_url, embellishment_id, created_at, is_anonymous, sender:sender_id(hub_name)')
      .eq('is_universe_letter', true)
      .in('paper_id', DRIFT_PAPER_IDS)
      .order('created_at', { ascending: false })
      .limit(30)

    if (blockedIds.length > 0) {
      query = query.not('sender_id', 'in', `(${blockedIds.join(',')})`)
    }

    const { data, error } = await query
    if (error) return []

    return ((data || []) as UniverseLetterRow[]).map((l) => ({
      id: l.id,
      senderId: (l.sender_id as string) || '',
      senderName: l.is_anonymous ? 'A Stranger' : (l.sender?.hub_name || 'A Stranger'),
      body: (l.body as string) || '',
      preview: l.body ? (l.body.length > 80 ? `${l.body.slice(0, 80)}...` : l.body) : '',
      subject: l.subject || 'Untitled',
      paperId: (l.paper_id as string) || 'void-parchment',
      fontId: (l.font_id as string) || 'almendra',
      fontColor: (l.font_color as string) || undefined,
      handwritingStyle: (l.handwriting_style as string) || 'typed',
      handwrittenImageUrl: (l.handwritten_image_url as string) || undefined,
      embellishmentId: (l.embellishment_id as string) || 'none',
      createdAt: (l.created_at as string) || undefined,
    }))
  } catch {
    return []
  }
}

export async function recordHubVisit(hubId: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user || user.id === hubId) return false

  const { data: hub, error: hubError } = await supabase
    .from('hubs')
    .select('id, visitor_book_enabled')
    .eq('id', hubId)
    .maybeSingle()

  if (hubError) throw hubError
  if (!hub || hub.visitor_book_enabled === false) return false

  const since = new Date(Date.now() - 45 * 60 * 1000).toISOString()
  const { data: recentVisit, error: recentError } = await supabase
    .from('hub_visits')
    .select('id')
    .eq('hub_id', hubId)
    .eq('visitor_id', user.id)
    .gte('visited_at', since)
    .order('visited_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentError) throw recentError
  if (recentVisit) return false

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('hub_visits')
    .upsert(
      { hub_id: hubId, visitor_id: user.id, visited_at: now },
      { onConflict: 'hub_id,visitor_id' },
    )

  if (error) {
    const { error: insertError } = await supabase
      .from('hub_visits')
      .insert({ hub_id: hubId, visitor_id: user.id, visited_at: now })
    if (insertError) throw insertError
  }
  return true
}

export async function getVisitorBook(limit = 18): Promise<VisitorBookEntry[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) return []

  const { data, error } = await supabase
    .from('hub_visits')
    .select('id, visitor_id, visited_at')
    .eq('hub_id', user.id)
    .order('visited_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  const rows = (data || []) as VisitorBookRow[]
  const visitorIds = Array.from(new Set(rows.map((row) => row.visitor_id).filter(Boolean))) as string[]
  const visitorsById = new Map<string, { hub_name?: string | null; avatar_url?: string | null }>()

  if (visitorIds.length > 0) {
    const { data: visitors, error: visitorsError } = await supabase
      .from('hubs')
      .select('id, hub_name, avatar_url')
      .in('id', visitorIds)

    if (visitorsError) throw visitorsError

    const visitorRows = (visitors || []) as Array<{ id: string; hub_name?: string | null; avatar_url?: string | null }>
    visitorRows.forEach((visitor) => {
      visitorsById.set(visitor.id, visitor)
    })
  }

  return rows.map((row) => {
    const visitor = row.visitor_id ? visitorsById.get(row.visitor_id) : undefined
    return {
      id: row.id as string,
      visitorId: (row.visitor_id as string) || '',
      visitorName: visitor?.hub_name || 'A Stranger',
      avatarUrl: visitor?.avatar_url || undefined,
      visitedAt: row.visited_at as string,
    }
  })
}

export async function setHubOnlineStatus(online: boolean) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) return

  const { error } = await supabase
    .from('hubs')
    .update({ online })
    .eq('id', user.id)

  if (error) throw error
}

export async function blockUser(blockedId: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Not authenticated')
  if (blockedId === user.id) throw new Error('Cannot block yourself')
  const { error } = await supabase.from('user_blocks').upsert(
    { blocker_id: user.id, blocked_id: blockedId },
    { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
  )
  if (error) throw error
}

export async function unblockUser(blockedId: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId)
  if (error) throw error
}

export async function getBlockedIds(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id)
    if (error) return []
    return (data || []).map((r: { blocked_id: string }) => r.blocked_id)
  } catch {
    return []
  }
}

export async function isBlocked(blockedId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      if (
        error.message?.includes('Refresh Token') ||
        error.message?.includes('refresh_token')
      ) {
        try {
          await supabase.auth.signOut()
        } catch {}
      }
      return null
    }
    return data.session ?? null
  } catch {
    return null
  }
}

// ── FIXED: removed aggressive signOut calls — transient errors no longer wipe the session ──
export async function getMyHub(userId?: string) {
  try {
    let uid = userId
    if (!uid) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) return null
      if (!user) return null
      uid = user.id
    }

    const { data, error } = await supabase
      .from('hubs')
      .select('*')
      .eq('id', uid)
      .maybeSingle()

    if (error) return null
    return data || null
  } catch {
    return null
  }
}

export async function getAllHubs(): Promise<HubRecord[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('hubs')
      .select('*')
      .neq('id', user?.id || '')

    if (error) return []
    return (data || []) as HubRecord[]
  } catch {
    return []
  }
}

export async function updateHub(updates: {
  hub_name?: string
  bio?: string
  ask_about?: string
  avatar_url?: string
  hub_style?: string
  backdrop_id?: string
  regen_count?: number
  visitor_book_enabled?: boolean
  [key: string]: unknown
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('No user found')

  if (updates.hub_name && normalizeHubName(updates.hub_name)) {
    await assertHubNameAvailable(updates.hub_name, user.id)
  }
  if (updates.bio !== undefined && updates.bio.length > MAX_BIO_LEN) {
    throw new Error(`Bio must be ${MAX_BIO_LEN} characters or fewer.`)
  }
  if (updates.ask_about !== undefined && updates.ask_about.length > MAX_ASK_LEN) {
    throw new Error(`Ask about must be ${MAX_ASK_LEN} characters or fewer.`)
  }

  const cleaned = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  )

  const { data, error } = await supabase
    .from('hubs')
    .update(cleaned)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMyAvatarHistory(): Promise<AvatarHistoryEntry[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('No user found')

  const { data, error } = await supabase
    .from('avatar_history')
    .select('id, image_url, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) throw error

  return ((data || []) as AvatarHistoryRow[]).map((row) => ({
    id: row.id,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  }))
}

export async function saveAvatarHistoryEntry(imageUrl: string): Promise<void> {
  const cleanUrl = imageUrl.trim()
  if (!cleanUrl) return

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('No user found')

  const { data: existing, error: existingError } = await supabase
    .from('avatar_history')
    .select('id')
    .eq('user_id', user.id)
    .eq('image_url', cleanUrl)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return

  const { error } = await supabase
    .from('avatar_history')
    .insert({ user_id: user.id, image_url: cleanUrl })

  if (error) throw error
}

export async function sendLetter(
  recipientId: string | null,
  body: string,
  paperId: string,
  isUniverseLetter = false,
  subject = 'A letter for you',
  fontId = 'cormorant',
  fontColor?: string,
  paperColor?: string,
  stampId?: string,
  envelopeId?: string,
  customArrivesAt?: Date,
  burnAfterReading?: boolean,
  voiceNoteUrl?: string,
  voiceEffect?: string,
  handwritingStyle?: HandwritingStyle,
  embellishmentId?: EmbellishmentId,
  handwrittenImageUrl?: string,
  isAnonymous?: boolean,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('No user found')
  if (!isUniverseLetter && !recipientId) throw new Error('Recipient required')

  const trimmedBody = body.trim()
  if (!trimmedBody && handwritingStyle !== 'handwritten') throw new Error('Letter body cannot be empty')
  if (handwritingStyle === 'handwritten' && !handwrittenImageUrl) throw new Error('Handwritten image required')

  const arrivesAt = customArrivesAt ? new Date(customArrivesAt.getTime()) : new Date()
  if (!customArrivesAt && !isUniverseLetter) {
    const len = trimmedBody.length
    let minHours: number, maxHours: number
    if (len < 200)          { minHours = 2;  maxHours = 6   }
    else if (len < 500)     { minHours = 6;  maxHours = 18  }
    else if (len < 1000)    { minHours = 18; maxHours = 36  }
    else if (len < 2000)    { minHours = 36; maxHours = 72  }
    else                    { minHours = 72; maxHours = 120 }
    const travelHours = minHours + Math.floor(Math.random() * (maxHours - minHours + 1))
    arrivesAt.setTime(arrivesAt.getTime() + travelHours * 60 * 60 * 1000)
  }

  const { data, error } = await supabase
    .from('letters')
    .insert([
      {
        sender_id: user.id,
        recipient_id: recipientId,
        body: trimmedBody,
        paper_id: paperId,
        is_universe_letter: isUniverseLetter,
        arrives_at: arrivesAt.toISOString(),
        status: isUniverseLetter ? 'arrived' : 'transit',
        subject,
        font_id: fontId,
        ...(fontColor ? { font_color: fontColor } : {}),
        ...(paperColor ? { paper_color: paperColor } : {}),
        ...(stampId ? { stamp_id: stampId } : {}),
        ...(envelopeId ? { envelope_id: envelopeId } : {}),
        ...(burnAfterReading ? { burn_after_reading: true } : {}),
        ...(voiceNoteUrl ? { voice_note_url: voiceNoteUrl, voice_effect: voiceEffect || 'raw' } : {}),
        handwriting_style: handwritingStyle || 'typed',
        ...(embellishmentId && embellishmentId !== 'none' ? { embellishment_id: embellishmentId } : {}),
        ...(handwrittenImageUrl ? { handwritten_image_url: handwrittenImageUrl } : {}),
        is_anonymous: isAnonymous === true,
      },
    ])
    .select()

  if (error) throw error
  return data
}

export async function deleteLetter(letterId: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Not authenticated')
  const { error } = await supabase.from('letters').delete().eq('id', letterId)
  if (error) throw error
}

export async function deleteLetterForEveryone(letterId: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Not authenticated')
  const { data: letter, error: fetchError } = await supabase
    .from('letters')
    .select('id')
    .eq('id', letterId)
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .maybeSingle()
  if (fetchError || !letter) throw new Error('Letter not found or access denied')
  const { error } = await supabase.from('letters').delete().eq('id', letterId)
  if (error) throw error
}

export async function uploadVoiceNote(blob: Blob): Promise<string> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Not authenticated')
  const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm'
  const path = `${user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('voice-notes')
    .upload(path, blob, { contentType: blob.type || 'audio/webm' })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('voice-notes').getPublicUrl(path)
  return urlData.publicUrl
}

export async function uploadHandwrittenImage(blob: Blob): Promise<string> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Not authenticated')
  const path = `${user.id}/${Date.now()}.png`
  const { error } = await supabase.storage
    .from('handwritten-letters')
    .upload(path, blob, { contentType: 'image/png' })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('handwritten-letters').getPublicUrl(path)
  return urlData.publicUrl
}

export async function getReturnPaths(): Promise<{ hubA: string; hubB: string }[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('letters')
      .select('sender:sender_id(hub_name), recipient:recipient_id(hub_name)')
      .eq('is_universe_letter', false)
      .gte('created_at', since)
      .limit(500)
    if (error || !data) return []
    const edges = new Set<string>()
    for (const row of data as ReturnPathRow[]) {
      const sender = row.sender?.hub_name
      const recipient = row.recipient?.hub_name
      if (sender && recipient) edges.add(`${sender}\u2192${recipient}`)
    }
    const seen = new Set<string>()
    const pairs: { hubA: string; hubB: string }[] = []
    for (const edge of edges) {
      const arrowIdx = edge.indexOf('\u2192')
      const a = edge.slice(0, arrowIdx)
      const b = edge.slice(arrowIdx + 1)
      if (edges.has(`${b}\u2192${a}`)) {
        const key = [a, b].sort().join('|')
        if (!seen.has(key)) { seen.add(key); pairs.push({ hubA: a, hubB: b }) }
      }
    }
    return pairs
  } catch { return [] }
}

export async function getMyLetters() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) return { userId: '', transit: [], arrived: [] }

  const now = new Date().toISOString()

  await Promise.allSettled([
    supabase.from('letters').update({ status: 'arrived' }).eq('recipient_id', user.id).eq('status', 'transit').lt('arrives_at', now),
    supabase.from('letters').update({ status: 'arrived' }).eq('sender_id', user.id).eq('status', 'transit').lt('arrives_at', now),
    supabase.from('letters').update({ status: 'arrived' }).eq('is_universe_letter', true).eq('status', 'transit'),
  ])

  const { data, error } = await supabase
    .from('letters')
    .select('*, is_universe_letter, sender:sender_id(hub_name), recipient:recipient_id(hub_name)')
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) throw error

  const letters = ((data || [])
    .filter((l) => !(l.is_universe_letter && DRIFT_PAPER_IDS.includes((l as { paper_id?: string | null }).paper_id || '')))) as LetterRecord[]

  return {
    userId: user.id,
    transit: letters.filter((l) => l.status === 'transit'),
    arrived: letters.filter((l) => l.status === 'arrived' || l.status === 'archive'),
  }
}

export function getPinnedLetterIds(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(`ds_pinned_${userId}`)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

export function pinLetter(letterId: string, userId: string): void {
  const ids = getPinnedLetterIds(userId)
  ids.add(letterId)
  localStorage.setItem(`ds_pinned_${userId}`, JSON.stringify([...ids]))
}

export function unpinLetter(letterId: string, userId: string): void {
  const ids = getPinnedLetterIds(userId)
  ids.delete(letterId)
  localStorage.setItem(`ds_pinned_${userId}`, JSON.stringify([...ids]))
}

export async function isGuestUser(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return true
    return (user as { is_anonymous?: boolean }).is_anonymous === true
  } catch {
    return true
  }
}

export async function upgradeGuestAccount(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email, password })
  if (error) throw error
}

function resizeAndCompressDataUrl(
  dataUrl: string,
  maxWidth = 512,
  maxHeight = 768,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas 2d context unavailable'))
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Failed to load image for resize'))
    img.src = dataUrl
  })
}

export async function uploadAvatarToStorage(
  base64DataUrl: string,
  userId: string,
): Promise<string> {
  const compressed = await resizeAndCompressDataUrl(base64DataUrl)

  const matches = compressed.match(/^data:(.+);base64,(.+)$/)
  if (!matches) throw new Error('Invalid base64 image format')

  const base64Data = matches[2]

  const byteCharacters = atob(base64Data)
  const byteArray = new Uint8Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i)
  }

  const filePath = `avatars/${userId}.jpg`

  const { error } = await supabase.storage.from('avatars').upload(filePath, byteArray, {
    contentType: 'image/jpeg',
    upsert: true,
  })

  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
  return data.publicUrl
}

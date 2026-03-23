import { supabase } from '../../lib/supabase'

function normalizeHubName(hubName: string) {
  return hubName.trim().toLowerCase()
}

async function assertHubNameAvailable(hubName: string, excludeUserId?: string) {
  const normalized = normalizeHubName(hubName)
  if (!normalized) throw new Error('Hub name is required.')

  const { data, error } = await supabase.from('hubs').select('id, hub_name')
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
    if (error instanceof Error && error.message === 'That hub name is already taken. Choose another one.') {
      return false
    }
    throw error
  }
}

// ── EMAIL / PASSWORD SIGN UP ──
export async function signUpAndCreateHub(
  email: string,
  password: string,
  hubName: string,
  bio: string,
  askAbout: string,
) {
  await assertHubNameAvailable(hubName)

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('No user returned after signup')

  const { error: hubError } = await supabase
    .from('hubs')
    .insert([
      {
        id: authData.user.id,
        hub_name: hubName,
        bio,
        ask_about: askAbout,
        email,
      },
    ])

  if (hubError) throw hubError
  return authData.user
}

// ── EMAIL / PASSWORD SIGN IN ──
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// ── GOOGLE SIGN IN ──
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })

  if (error) throw error
}

// ── CREATE HUB FOR EXISTING AUTH USER ──
export async function createHubForCurrentUser(
  hubName: string,
  bio: string,
  askAbout: string,
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
      },
    ])
    .select()
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Hub could not be created.')

  return data
}

// ── ANONYMOUS SIGN IN ──
export async function signInAndCreateHub(hubName: string, bio: string, askAbout: string) {
  await assertHubNameAvailable(hubName)

  const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
  if (authError) throw authError
  if (!authData.user) throw new Error('No user returned')

  const { error: hubError } = await supabase
    .from('hubs')
    .insert([
      {
        id: authData.user.id,
        hub_name: hubName,
        bio,
        ask_about: askAbout,
      },
    ])

  if (hubError) throw hubError
  return authData.user
}

// ── SIGN OUT ──
export async function signOut() {
  try {
    await supabase.auth.signOut()
  } catch (err) {
    console.error('signOut failed:', err)
  }
}

// ── DELETE ACCOUNT / HUB ──
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error('No user found')

    const userId = user.id

    const { error: lettersError } = await supabase
      .from('letters')
      .delete()
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)

    if (lettersError) throw new Error(`Letters delete failed: ${lettersError.message}`)

    const { error: hubError } = await supabase
      .from('hubs')
      .delete()
      .eq('id', userId)

    if (hubError) throw new Error(`Hub delete failed: ${hubError.message}`)

    await supabase.auth.signOut()

    return { success: true }
  } catch (err: any) {
    console.error('deleteAccount failed:', err)
    return {
      success: false,
      error: err?.message || 'Delete failed',
    }
  }
}

// ── EXPORT MY LETTERS ──
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

    const letters = data || []

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

    letters.forEach((l: any, i: number) => {
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

// ── GET UNIVERSE LETTERS ──
export async function getUniverseLetters() {
  try {
    const { data, error } = await supabase
      .from('letters')
      .select('id, body, subject, sender:sender_id(hub_name)')
      .eq('is_universe_letter', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return []

    return (data || []).map((l: any) => ({
      id: l.id,
      senderName: l.sender?.hub_name || 'A Stranger',
      preview: l.body ? (l.body.length > 120 ? `${l.body.slice(0, 120)}...` : l.body) : '',
      subject: l.subject || 'A letter for you',
    }))
  } catch {
    return []
  }
}

// ── GET SESSION ──
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
        try { await supabase.auth.signOut() } catch {}
      }
      return null
    }

    return data.session
  } catch {
    try { await supabase.auth.signOut() } catch {}
    return null
  }
}

// ── GET MY HUB ──
export async function getMyHub() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      if (
        userError.message?.includes('Refresh Token') ||
        userError.message?.includes('refresh_token')
      ) {
        try { await supabase.auth.signOut() } catch {}
      }
      return null
    }

    if (!user) return null

    const { data, error } = await supabase
      .from('hubs')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      if (
        error.message?.includes('JWT') ||
        error.message?.includes('Refresh Token') ||
        error.message?.includes('refresh_token')
      ) {
        try { await supabase.auth.signOut() } catch {}
      }
      return null
    }

    return data || null
  } catch {
    try { await supabase.auth.signOut() } catch {}
    return null
  }
}

// ── GET ALL HUBS ──
export async function getAllHubs() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase.from('hubs').select('*').neq('id', user?.id || '')

    if (error) return []
    return data || []
  } catch {
    return []
  }
}

// ── UPDATE HUB ──
export async function updateHub(updates: {
  hub_name?: string
  bio?: string
  ask_about?: string
  avatar_url?: string
  hub_style?: string
  backdrop_id?: string
  regen_count?: number
  [key: string]: any
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

  const cleaned = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
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

// ── SEND LETTER ──
export async function sendLetter(
  recipientId: string | null,
  body: string,
  paperId: string,
  isUniverseLetter = false,
  subject = 'A letter for you',
  fontId = 'cormorant',
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('No user found')
  if (!isUniverseLetter && !recipientId) throw new Error('Recipient required')

  const trimmedBody = body.trim()
  if (!trimmedBody) throw new Error('Letter body cannot be empty')

  const travelDays = Math.floor(Math.random() * 7) + 1
  const arrivesAt = new Date()
  arrivesAt.setDate(arrivesAt.getDate() + travelDays)

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
        subject,
        font_id: fontId,
      },
    ])
    .select()

  if (error) throw error
  return data
}

// ── GET MY LETTERS ──
export async function getMyLetters() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { transit: [], arrived: [], archive: [] }

    const now = new Date().toISOString()

    await supabase
      .from('letters')
      .update({ status: 'arrived' })
      .eq('recipient_id', user.id)
      .eq('status', 'transit')
      .lt('arrives_at', now)

    const { data, error } = await supabase
      .from('letters')
      .select('*, sender:sender_id(hub_name), recipient:recipient_id(hub_name)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) return { transit: [], arrived: [], archive: [] }

    const letters = data || []

    return {
      transit: letters.filter((l: any) => l.status === 'transit'),
      arrived: letters.filter((l: any) => l.status === 'arrived'),
      archive: letters.filter((l: any) => l.status === 'archive'),
    }
  } catch {
    return { transit: [], arrived: [], archive: [] }
  }
}

// ── CHECK IF USER IS ANONYMOUS (GUEST) ──
export async function isGuestUser(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return true
    return (user as any).is_anonymous === true
  } catch {
    return true
  }
}

// ── UPGRADE GUEST TO EMAIL ACCOUNT ──
export async function upgradeGuestAccount(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email, password })
  if (error) throw error
}

// ── UPLOAD AVATAR TO STORAGE ──
export async function uploadAvatarToStorage(base64DataUrl: string, userId: string): Promise<string> {
  const matches = base64DataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!matches) throw new Error('Invalid base64 image format')

  const mimeType = matches[1]
  const base64Data = matches[2]
  const ext = mimeType.includes('png') ? 'png' : 'jpg'

  const byteCharacters = atob(base64Data)
  const byteArray = new Uint8Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i)
  }

  const filePath = `avatars/${userId}.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, byteArray, {
      contentType: mimeType,
      upsert: true,
    })

  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
  return data.publicUrl
}
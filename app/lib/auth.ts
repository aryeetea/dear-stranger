import { supabase } from '../../lib/supabase'

interface SelectedStyle {
  id?: string
  label?: string
  desc?: string
}

export async function signInAndCreateHub(
  hubName: string,
  bio: string,
  askAbout: string,
  selectedStyle?: SelectedStyle,
) {
  const { data: authData, error: authError } =
    await supabase.auth.signInAnonymously()

  if (authError) {
    console.error('Auth error code:', authError.code)
    console.error('Auth error message:', authError.message)
    throw authError
  }

  if (!authData.user) {
    throw new Error('No user returned after anonymous sign-in')
  }

  const userId = authData.user.id
  console.log('Signed in user id:', userId)

  const { data: hubData, error: hubError } = await supabase
    .from('hubs')
    .insert([
      {
        id: userId,
        hub_name: hubName,
        bio,
        ask_about: askAbout,
        avatar_style_label: selectedStyle?.label || null,
        avatar_style_desc: selectedStyle?.desc || null,
      },
    ])
    .select()

  console.log('Hub insert result:', hubData)

  if (hubError) {
    console.error('Hub insert error code:', hubError.code)
    console.error('Hub insert error message:', hubError.message)
    throw hubError
  }

  return authData.user
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('signOut error:', error.message)
    }
  } catch (err) {
    console.error('signOut failed:', err)
  }
}

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error('getSession error:', error.message)

      if (
        error.message?.includes('Refresh Token Not Found') ||
        error.message?.includes('Invalid Refresh Token') ||
        error.message?.includes('refresh_token')
      ) {
        try {
          await supabase.auth.signOut()
        } catch {}
      }

      return null
    }

    return data.session
  } catch (err) {
    console.error('getSession failed:', err)
    try {
      await supabase.auth.signOut()
    } catch {}
    return null
  }
}

export async function getMyHub() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('getMyHub user error:', userError.message)

      if (
        userError.message?.includes('Refresh Token Not Found') ||
        userError.message?.includes('Invalid Refresh Token') ||
        userError.message?.includes('refresh_token')
      ) {
        try {
          await supabase.auth.signOut()
        } catch {}
      }

      return null
    }

    if (!user) {
      console.log('getMyHub: no user found')
      return null
    }

    console.log('getMyHub: looking for hub with id:', user.id)

    const { data, error } = await supabase
      .from('hubs')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.log('getMyHub error code:', error.code)
      console.log('getMyHub error message:', error.message)

      if (
        error.code === 'PGRST116' ||
        error.message?.includes('JWT') ||
        error.message?.includes('refresh_token') ||
        error.message?.includes('Refresh Token Not Found') ||
        error.message?.includes('Invalid Refresh Token') ||
        error.message?.includes('not found')
      ) {
        console.log('getMyHub: stale session detected, signing out')
        try {
          await supabase.auth.signOut()
        } catch {}
      }

      return null
    }

    console.log('getMyHub result:', data)
    return data
  } catch (err) {
    console.error('getMyHub failed:', err)
    try {
      await supabase.auth.signOut()
    } catch {}
    return null
  }
}

export async function getAllHubs() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('getAllHubs user error:', userError.message)
      return []
    }

    const { data, error } = await supabase
      .from('hubs')
      .select('*')
      .neq('id', user?.id || '')

    if (error) {
      console.error('Get all hubs error:', error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.error('getAllHubs failed:', err)
    return []
  }
}

export async function updateHub(updates: {
  hub_name?: string
  bio?: string
  ask_about?: string
  avatar_url?: string
  avatar_style_label?: string
  avatar_style_desc?: string
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error('updateHub user error:', userError.message)
    throw userError
  }

  if (!user) throw new Error('No user found')

  const cleanedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  )

  const { data, error } = await supabase
    .from('hubs')
    .update(cleanedUpdates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    console.error('updateHub error:', error.message)
    throw error
  }

  return data
}

export async function sendLetter(
  recipientId: string | null,
  body: string,
  paperId: string,
  isUniverseLetter: boolean = false,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error('sendLetter user error:', userError.message)
    throw userError
  }

  if (!user) throw new Error('No user found')
  if (!isUniverseLetter && !recipientId) throw new Error('Recipient is required')

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
      },
    ])
    .select()

  if (error) {
    console.error('sendLetter error:', error.message)
    throw error
  }

  return data
}

export async function getMyLetters() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('getMyLetters user error:', userError.message)
      return { transit: [], arrived: [], archive: [] }
    }

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
      .select(`*, sender:sender_id(hub_name), recipient:recipient_id(hub_name)`)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get letters error:', error.message)
      return { transit: [], arrived: [], archive: [] }
    }

    const letters = data || []

    return {
      transit: letters.filter((l: any) => l.status === 'transit'),
      arrived: letters.filter((l: any) => l.status === 'arrived'),
      archive: letters.filter((l: any) => l.status === 'archive'),
    }
  } catch (err) {
    console.error('getMyLetters failed:', err)
    return { transit: [], arrived: [], archive: [] }
  }
}
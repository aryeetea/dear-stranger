import { supabase } from '../../lib/supabase'

// Sign in anonymously and create a hub
export async function signInAndCreateHub(
  hubName: string,
  bio: string,
  askAbout: string,
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

// Get current session
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// Get current user's hub
export async function getMyHub() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    console.log('getMyHub error hint:', error.hint)
    console.log('getMyHub error details:', error.details)
    return null
  }

  console.log('getMyHub result:', data)
  return data
}

// Get all other hubs for the universe map
export async function getAllHubs() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('hubs')
    .select('*')
    .neq('id', user?.id || '')

  if (error) {
    console.error('Get all hubs error code:', error.code)
    console.error('Get all hubs error message:', error.message)
    console.error('Get all hubs error details:', error.details)
    console.error('Get all hubs error hint:', error.hint)
    return []
  }

  return data || []
}

// Update hub profile
export async function updateHub(updates: {
  hub_name?: string
  bio?: string
  ask_about?: string
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No user found')
  }

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
    console.error('updateHub error code:', error.code)
    console.error('updateHub error message:', error.message)
    console.error('updateHub error details:', error.details)
    console.error('updateHub error hint:', error.hint)
    throw error
  }

  return data
}

// Send a letter
export async function sendLetter(
  recipientId: string | null,
  body: string,
  paperId: string,
  isUniverseLetter: boolean = false,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('sendLetter: no user found')
    throw new Error('No user found')
  }

  if (!isUniverseLetter && !recipientId) {
    throw new Error('Recipient is required for a normal letter')
  }

  const trimmedBody = body.trim()
  if (!trimmedBody) {
    throw new Error('Letter body cannot be empty')
  }

  console.log('sendLetter: sender id:', user.id)
  console.log('sendLetter: recipient id:', recipientId)

  const travelDays = Math.floor(Math.random() * 7) + 1
  const arrivesAt = new Date()
  arrivesAt.setDate(arrivesAt.getDate() + travelDays)

  const letterPayload = {
    sender_id: user.id,
    recipient_id: recipientId,
    body: trimmedBody,
    paper_id: paperId,
    is_universe_letter: isUniverseLetter,
    arrives_at: arrivesAt.toISOString(),
  }

  console.log('sendLetter payload:', letterPayload)

  const { data, error } = await supabase
    .from('letters')
    .insert([letterPayload])
    .select()

  if (error) {
    console.error('sendLetter error code:', error.code)
    console.error('sendLetter error message:', error.message)
    console.error('sendLetter error hint:', error.hint)
    console.error('sendLetter error details:', error.details)
    throw error
  }

  console.log('sendLetter success:', data)
  return data
}

// Get my letters
export async function getMyLetters() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { transit: [], arrived: [], archive: [] }
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('letters')
    .update({ status: 'arrived' })
    .eq('recipient_id', user.id)
    .eq('status', 'transit')
    .lt('arrives_at', now)

  if (updateError) {
    console.error('Auto-update letters error code:', updateError.code)
    console.error('Auto-update letters error message:', updateError.message)
    console.error('Auto-update letters error details:', updateError.details)
    console.error('Auto-update letters error hint:', updateError.hint)
  }

  const { data, error } = await supabase
    .from('letters')
    .select(`
      *,
      sender:sender_id(hub_name),
      recipient:recipient_id(hub_name)
    `)
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get letters error code:', error.code)
    console.error('Get letters error message:', error.message)
    console.error('Get letters error details:', error.details)
    console.error('Get letters error hint:', error.hint)
    return { transit: [], arrived: [], archive: [] }
  }

  const letters = data || []

  return {
    transit: letters.filter((letter: any) => letter.status === 'transit'),
    arrived: letters.filter((letter: any) => letter.status === 'arrived'),
    archive: letters.filter((letter: any) => letter.status === 'archive'),
  }
}
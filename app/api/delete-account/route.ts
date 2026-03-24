import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://kmwpivcnjyakxceogjdl.supabase.co'

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  if (!error) return false

  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    error.message?.includes('Could not find the table') === true ||
    error.message?.includes('relation') === true
  )
}

async function deleteIfPresent(
  runDelete: () => Promise<{ error: { code?: string; message?: string } | null }>,
) {
  const { error } = await runDelete()

  if (error && !isMissingTableError(error)) {
    throw error
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 })
    }

    const admin = getAdminClient()

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 })
    }

    await deleteIfPresent(async () => {
      const { error } = await admin.from('hub_relics').delete().eq('user_id', user.id)
      return { error }
    })

    await deleteIfPresent(async () => {
      const { error } = await admin.from('constellation_hubs').delete().eq('user_id', user.id)
      return { error }
    })

    await deleteIfPresent(async () => {
      const { error } = await admin.from('constellation_hubs').delete().eq('hub_id', user.id)
      return { error }
    })

    const { error: lettersError } = await admin
      .from('letters')
      .delete()
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)

    if (lettersError) throw lettersError

    const { error: hubError } = await admin
      .from('hubs')
      .delete()
      .eq('id', user.id)

    if (hubError) throw hubError

    await admin.storage.from('avatars').remove([
      `avatars/${user.id}.png`,
      `avatars/${user.id}.jpg`,
      `avatars/${user.id}.jpeg`,
    ]).catch(() => undefined)

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      throw deleteUserError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('delete-account route failed:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Account deletion failed.',
      },
      { status: 500 },
    )
  }
}

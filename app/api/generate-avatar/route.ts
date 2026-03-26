import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

// Only allow fetching images from our own Supabase storage to prevent SSRF
function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null
    return (
      parsed.protocol === 'https:' &&
      supabaseHost !== null &&
      parsed.hostname === supabaseHost
    )
  } catch {
    return false
  }
}

type Mode = 'create' | 'reimagine'

function normalizeDetail(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[,.;:\s]+|[,.;:\s]+$/g, '')
    .trim()
}

const STYLE_DESCRIPTORS: Record<string, string> = {
  fantasy: 'fantasy illustration style — magical, ethereal, mythical, otherworldly',
  modern: 'modern realistic style — clean, stylish, contemporary',
  'fantasy-modern': 'fantasy-modern hybrid style — blend of magical and contemporary',
  celestial: 'celestial style — stars, moonlight, cosmic, divine energy',
  royal: 'royal style — elegant, luxurious, noble, powerful',
  streetwear: 'streetwear style — bold, urban, expressive, trendy',
  futuristic: 'futuristic style — sleek, sci-fi, glowing, advanced technology',
  nature: 'nature-inspired style — earthy, floral, organic, peaceful',
}

function buildAvatarPrompt(
  answers: string[],
  style?: string,
  feedback?: string,
  mode: Mode = 'create',
) {
  const trimmedAnswers = answers
    .map((a) => normalizeDetail(a))
    .filter(Boolean)
    .slice(0, 8)

  const details = trimmedAnswers.join(', ')

  const feedbackLine = feedback?.trim() ? normalizeDetail(feedback) : ''

  const styleDesc = style ? STYLE_DESCRIPTORS[style.toLowerCase()] : undefined
  const styleLine = styleDesc
    ? `Cinematic, highly detailed digital painting, soft glow lighting, semi-realistic, polished ${styleDesc}.`
    : 'Cinematic, highly detailed digital painting, soft glow lighting, semi-realistic, polished fantasy illustration style.'

  if (mode === 'reimagine') {
    if (feedbackLine) {
      return [
        `Create a full body character portrait EXACTLY as described: ${feedbackLine}. You must follow the user's description precisely — do not add, remove, or change any details. This is your only directive.`,
        details ? `Original character reference context: ${details}.` : '',
        styleLine,
        'Rendering: full body visible head to toe, vertical composition, face clearly lit and readable, rich atmospheric background that complements the character, no text, no watermark, no logo.',
      ]
        .filter(Boolean)
        .join('\n\n')
    }
    return [
      details
        ? `Create a reimagined full body character portrait. The character is described as: ${details}. Match the person's appearance, skin tone, hair, clothing, body, and features as closely as possible to the description provided. Do not invent or omit any details.`
        : `Create a full body character portrait of a mysterious figure in a cinematic illustrated style.`,
      styleLine,
      'Rendering: full body visible head to toe, vertical composition, face clearly lit and readable, rich atmospheric background that complements the character, no text, no watermark, no logo.',
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  return [
    details
      ? `Create a full body character portrait. The character is described as: ${details}. Match the person's appearance, skin tone, hair, clothing, body, and features closely to the description provided.`
      : `Create a full body character portrait of a mysterious figure in a cinematic illustrated style.`,
    styleLine,
    'Rendering: full body visible head to toe, vertical composition, face clearly lit and readable, rich atmospheric background that complements the character, no text, no watermark, no logo.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

function parseAnswers(answers: unknown): string[] {
  if (!answers || typeof answers !== 'object') return []

  return Object.entries(answers as Record<string, unknown>)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, answer]) => normalizeDetail(String(answer ?? '')))
    .filter(Boolean)
}

async function generateWithGptImage(
  openai: OpenAI,
  prompt: string,
  userId?: string,
  previousImageUrl?: string,
  mode: Mode = 'create',
) {
  if (mode === 'reimagine' && previousImageUrl) {
    let imageFile: File

    if (previousImageUrl.startsWith('data:')) {
      const [meta, base64] = previousImageUrl.split(',')
      const mimeType = meta.split(':')[1].split(';')[0]
      const buffer = Buffer.from(base64, 'base64')
      imageFile = new File([buffer], 'image.jpg', { type: mimeType })
    } else {
      if (!isAllowedImageUrl(previousImageUrl)) {
        throw new Error('Image URL is not from an allowed source.')
      }
      const resp = await fetch(previousImageUrl)
      const buffer = await resp.arrayBuffer()
      imageFile = new File([buffer], 'image.jpg', { type: 'image/jpeg' })
    }

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: prompt.slice(0, 4000),
      size: '1024x1536',
    } as any)

    const image = response.data?.[0]
    if (!image?.b64_json) {
      throw new Error('gpt-image-1 edit returned no image data.')
    }

    return {
      imageUrl: `data:image/jpeg;base64,${image.b64_json}`,
      revisedPrompt: (image as any).revised_prompt || prompt,
      provider: 'gpt-image-1',
    }
  }

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: prompt.slice(0, 4000),
    size: '1024x1536',
    quality: 'high',
    output_format: 'jpeg',
    user: userId || undefined,
  } as any)

  const image = response.data?.[0]
  if (!image?.b64_json) {
    throw new Error('gpt-image-1 returned no image data.')
  }

  return {
    imageUrl: `data:image/jpeg;base64,${image.b64_json}`,
    revisedPrompt: (image as any).revised_prompt || prompt,
    provider: 'gpt-image-1',
  }
}

async function generateWithDallE3(openai: OpenAI, prompt: string) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: prompt.slice(0, 4000),
    size: '1024x1792',
    quality: 'hd',
    response_format: 'b64_json',
  } as any)

  const image = response.data?.[0]
  if (!image?.b64_json) {
    throw new Error('dall-e-3 returned no image data.')
  }

  return {
    imageUrl: `data:image/png;base64,${image.b64_json}`,
    revisedPrompt: (image as any).revised_prompt || prompt,
    provider: 'dall-e-3',
  }
}

export async function POST(req: Request) {
  try {
    // Verify the caller has a valid Supabase session
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { authorization: `Bearer ${token}` } },
      })
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await req.json()
    const {
      answers,
      feedback,
      userId,
      style,
      mode,
      previousImageUrl,
    }: {
      answers?: unknown
      feedback?: string
      userId?: string
      style?: string
      mode?: string
      previousImageUrl?: string
    } = body

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY' },
        { status: 500 },
      )
    }

    const orderedAnswers = parseAnswers(answers)
    if (orderedAnswers.length === 0) {
      return NextResponse.json(
        { error: 'No answers provided.' },
        { status: 400 },
      )
    }

    const generationMode: Mode = mode === 'reimagine' ? 'reimagine' : 'create'

    const imagePrompt = buildAvatarPrompt(
      orderedAnswers,
      style,
      feedback,
      generationMode,
    )

    const openai = new OpenAI({ apiKey: openaiKey })

    try {
      const result = await generateWithGptImage(openai, imagePrompt, userId, previousImageUrl, generationMode)
      return NextResponse.json({
        imageUrl: result.imageUrl,
        prompt: result.revisedPrompt,
        provider: result.provider,
      })
    } catch (gptError) {
      console.warn('gpt-image-1 failed, trying dall-e-3:', gptError)

      const result = await generateWithDallE3(openai, imagePrompt)
      return NextResponse.json({
        imageUrl: result.imageUrl,
        prompt: result.revisedPrompt,
        provider: result.provider,
      })
    }
  } catch (error) {
    console.error('generate-avatar error:', error)

    return NextResponse.json(
      { error: toErrorMessage(error) || 'Failed to generate avatar.' },
      { status: 500 },
    )
  }
}
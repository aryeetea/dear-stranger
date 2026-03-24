import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

type GenerationMode = 'create' | 'reimagine'

function normalizeDetail(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[,.;:\s]+|[,.;:\s]+$/g, '')
    .trim()
}

async function withTimeout<T>(promise: Promise<T>, ms = 45000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms),
  )

  return Promise.race([promise, timeout])
}

const STYLE_DIRECTIONS: Record<string, string> = {
  fantasy:
    'Stylized semi realistic fantasy character portrait, cinematic lighting, rich jewel tones, magical atmosphere, elegant fabrics, detailed face, strong depth, not cartoon.',
  modern:
    'Stylized semi realistic modern fashion portrait, editorial feel, sharp styling, clean silhouette, realistic folds, elegant city mood, not cartoon.',
  'fantasy-modern':
    'Stylized semi realistic fantasy modern portrait, contemporary fashion mixed with subtle magical elements, cinematic light, polished concept art, not cartoon.',
  celestial:
    'Stylized semi realistic celestial portrait, moonlit glow, silver blue tones, ethereal atmosphere, luminous highlights, detailed face, not cartoon.',
  royal:
    'Stylized semi realistic regal portrait, luxurious fabrics, gold accents, noble presence, dramatic lighting, elegant detail, not cartoon.',
  streetwear:
    'Stylized semi realistic streetwear portrait, fashionable urban styling, bold outfit, layered clothing, cinematic city lighting, concept art quality, not cartoon.',
  futuristic:
    'Stylized semi realistic futuristic portrait, elegant sci fi fashion, glowing details, sleek materials, cinematic neon atmosphere, not cartoon.',
  nature:
    'Stylized semi realistic nature inspired portrait, earthy palette, organic textures, floral accents, soft atmospheric light, detailed face, not cartoon.',
  earthbound:
    'Stylized semi realistic grounded portrait, natural lighting, warm tones, elegant realism, not cartoon.',
  'mythic-modern':
    'Stylized semi realistic mythic modern portrait, dramatic light, modern fashion with subtle mystical detail, not cartoon.',
  regal:
    'Stylized semi realistic regal portrait, rich fabrics, gold detail, powerful elegance, not cartoon.',
  nocturne:
    'Stylized semi realistic night portrait, moody cinematic shadows, colored highlights, not cartoon.',
  'luminous-future':
    'Stylized semi realistic futuristic portrait, glowing light, sleek materials, elegant sci fi atmosphere, not cartoon.',
  garden:
    'Stylized semi realistic garden portrait, warm greens, organic textures, soft natural light, not cartoon.',
  sanctuary:
    'Stylized semi realistic sacred portrait, candlelit atmosphere, spiritual calm, elegant realism, not cartoon.',
  'velvet-gothic':
    'Stylized semi realistic gothic portrait, dramatic shadows, velvet textures, romantic dark mood, not cartoon.',
  tideborn:
    'Stylized semi realistic oceanic portrait, cool blue light, flowing fabrics, watery atmosphere, not cartoon.',
}

function buildAvatarPrompt(
  answers: string[],
  style?: string,
  feedback?: string,
  mode: GenerationMode = 'create',
) {
  const details = answers
    .map((a, i) => `${i + 1}. ${normalizeDetail(a)}`)
    .join('\n')

  const styleKey = (style || '').toLowerCase().replace(/\s+/g, '-')
  const styleDirection = STYLE_DIRECTIONS[styleKey] || STYLE_DIRECTIONS.modern

  const modeLine =
    mode === 'reimagine'
      ? 'This is a reimagining of an existing avatar. Keep the same core identity and vibe, but improve polish, lighting, anatomy, outfit detail, and overall visual quality.'
      : 'Create the character from scratch based on the description below.'

  return `
Create a vertical full body stylized semi realistic character portrait.

${styleDirection}

${modeLine}

Requirements:
- full body visible from head to toe
- vertical composition
- highly polished character concept art
- strong face structure and expressive eyes
- realistic clothing folds and texture detail
- cinematic lighting with visible depth and shadows
- beautiful atmospheric background
- not flat
- not chibi
- not cartoon
- not childish
- not overly anime
- no text
- no watermark
- one character only

Character details:
${details}

${feedback ? `Revision note: ${normalizeDetail(feedback)}` : ''}
`
    .trim()
}

async function generateWithGptImage(
  openai: OpenAI,
  prompt: string,
  userId: string | undefined,
  mode: GenerationMode,
) {
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: mode === 'reimagine' ? '1024x1024' : '1024x1536',
    quality: mode === 'reimagine' ? 'medium' : 'high',
    output_format: 'jpeg',
    user: userId || undefined,
  } as never)

  const image = response.data?.[0]

  if (!image?.b64_json) {
    console.error('GPT IMAGE BAD RESPONSE:', response)
    throw new Error('No image returned from gpt-image-1')
  }

  return {
    imageUrl: `data:image/jpeg;base64,${image.b64_json}`,
    revisedPrompt: (image as { revised_prompt?: string }).revised_prompt || prompt,
  }
}

async function generateWithDalle(
  openai: OpenAI,
  prompt: string,
  userId: string | undefined,
  mode: GenerationMode,
) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: mode === 'reimagine' ? '1024x1024' : '1024x1792',
    quality: mode === 'reimagine' ? 'standard' : 'hd',
    style: 'vivid',
    response_format: 'b64_json',
    user: userId || undefined,
  })

  const image = response.data?.[0]

  if (!image?.b64_json) {
    console.error('DALLE BAD RESPONSE:', response)
    throw new Error('dall-e-3 returned no image')
  }

  return {
    imageUrl: `data:image/png;base64,${image.b64_json}`,
    revisedPrompt: image.revised_prompt || prompt,
  }
}

export async function POST(req: Request) {
  try {
    const { answers, feedback, style, mode, userId } = await req.json()

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const orderedAnswers = Object.entries(answers || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, answer]) => normalizeDetail(String(answer)))
      .filter(Boolean)

    if (orderedAnswers.length === 0) {
      return NextResponse.json({ error: 'No answers provided.' }, { status: 400 })
    }

    const generationMode: GenerationMode = mode === 'reimagine' ? 'reimagine' : 'create'
    const prompt = buildAvatarPrompt(orderedAnswers, style, feedback, generationMode)
    const openai = new OpenAI({ apiKey: openaiKey })

    try {
      const result = await withTimeout(
        generateWithGptImage(openai, prompt, userId, generationMode),
        45000,
      )

      return NextResponse.json({
        imageUrl: result.imageUrl,
        prompt: result.revisedPrompt,
      })
    } catch (primaryError) {
      console.error('PRIMARY FAILED:', primaryError)

      const fallback = await withTimeout(
        generateWithDalle(openai, prompt, userId, generationMode),
        45000,
      )

      return NextResponse.json({
        imageUrl: fallback.imageUrl,
        prompt: fallback.revisedPrompt,
      })
    }
  } catch (error) {
    console.error('ROUTE ERROR:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate avatar.' },
      { status: 500 },
    )
  }
}
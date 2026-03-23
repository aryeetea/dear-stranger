import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

function normalizeDetail(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[,.;:\s]+|[,.;:\s]+$/g, '')
    .trim()
}

const STYLE_DIRECTIONS: Record<string, string> = {
  fantasy: `2D fantasy character illustration, digital art style, NOT photorealistic. Flowing magical robes, ethereal fabrics, glowing runes. Rich jewel tones — deep purples, midnight blues, gold. Background: misty enchanted forest or ancient stone archway. Flat stylized shading, concept art quality.`,
  modern: `2D contemporary fashion illustration, digital art style, NOT photorealistic. Clean stylish outfit — tailored jacket or elevated casual wear. Neutral tones with one bold accent. Background: moody urban architecture at dusk. Editorial illustration quality.`,
  'fantasy-modern': `2D fantasy-modern fusion illustration, digital art style, NOT photorealistic. Magical elements woven into contemporary fashion — glowing accessories, iridescent fabrics. Background: neon-lit city meets starlit sky. Stylized concept art quality.`,
  celestial: `2D celestial character illustration, digital art style, NOT photorealistic. Flowing cosmic robes with stars and moon phases, silver and indigo palette. Background: deep space nebula with soft aurora. Stylized ethereal art quality.`,
  royal: `2D regal portrait illustration, digital art style, NOT photorealistic. Elaborate noble attire — rich velvets, gold embroidery, ornate headpiece. Deep jewel tones. Background: candlelit palace hall. Stylized storybook art quality.`,
  streetwear: `2D urban fashion illustration, digital art style, NOT photorealistic. Stylish streetwear — oversized jacket, bold graphic tee, cargo pants, designer sneakers. Background: rain-slicked city street at night with neon reflections. Stylized concept art quality.`,
  futuristic: `2D sci-fi character illustration, digital art style, NOT photorealistic. Sleek futuristic outfit — form-fitting suit with glowing tech details. Background: neon megacity skyline. Stylized anime-influenced concept art quality.`,
  nature: `2D nature-inspired character illustration, digital art style, NOT photorealistic. Flowing earthy garments with floral botanical details, warm greens and terracottas. Background: misty ancient forest with golden light. Stylized storybook art quality.`,
}

function buildAvatarPrompt(answers: string[], style?: string, feedback?: string) {
  const trimmedAnswers = answers
    .map((a) => normalizeDetail(a))
    .filter(Boolean)
    .slice(0, 8)

  const details = trimmedAnswers
    .map((a, i) => `${i + 1}. ${a}`)
    .join('\n')

  const styleKey = (style || '').toLowerCase().replace(/\s+/g, '-')
  const styleDirection = STYLE_DIRECTIONS[styleKey] || STYLE_DIRECTIONS.modern

  const feedbackLine = feedback?.trim()
    ? `Important revision note: ${normalizeDetail(feedback)}.`
    : ''

  return [
    `Create a single full-body character portrait. ${styleDirection}`,
    'Illustrated, stylized, NOT photorealistic. Think character design or concept art — clean lines, expressive, artistic.',
    'Full body visible from head to toe. Vertical portrait composition. Clean readable silhouette against the background.',
    'No text, no watermarks, no logos.',
    details ? `Character details from their self-description:\n${details}` : '',
    feedbackLine,
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function generateWithGptImage(openai: OpenAI, prompt: string, userId?: string) {
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1536',
    quality: 'low',
    output_format: 'jpeg',
    user: userId || undefined,
  } as any)

  const image = response.data?.[0]
  if (!image?.b64_json) throw new Error('gpt-image-1 returned no image data.')

  return {
    imageUrl: `data:image/jpeg;base64,${image.b64_json}`,
    revisedPrompt: (image as any).revised_prompt || prompt,
  }
}

async function generateWithDalle(openai: OpenAI, prompt: string, userId?: string) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1792',
    quality: 'standard',
    style: 'vivid',
    response_format: 'b64_json',
    user: userId || undefined,
  })

  const image = response.data?.[0]
  if (image?.b64_json) {
    return {
      imageUrl: `data:image/png;base64,${image.b64_json}`,
      revisedPrompt: image.revised_prompt || prompt,
    }
  }
  throw new Error('dall-e-3 returned no image data.')
}

export async function POST(req: Request) {
  try {
    const { answers, feedback, userId, style } = await req.json()

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

    const imagePrompt = buildAvatarPrompt(orderedAnswers, style, feedback)
    const openai = new OpenAI({ apiKey: openaiKey })

    try {
      const result = await generateWithGptImage(openai, imagePrompt, userId)
      return NextResponse.json({ imageUrl: result.imageUrl, prompt: result.revisedPrompt })
    } catch (primaryError) {
      console.warn('gpt-image-1 failed, falling back to dall-e-3:', primaryError)
      const fallback = await generateWithDalle(openai, imagePrompt, userId)
      return NextResponse.json({ imageUrl: fallback.imageUrl, prompt: fallback.revisedPrompt })
    }
  } catch (error) {
    console.error('generate-avatar error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate avatar.' },
      { status: 500 },
    )
  }
}
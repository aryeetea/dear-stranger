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
  fantasy: `High fantasy illustration. Flowing magical robes, ethereal fabrics, glowing runes or subtle magic. Rich jewel tones — deep purples, midnight blues, gold. Background: misty enchanted forest or ancient stone archway with soft magical light. Painterly and cinematic.`,
  modern: `Contemporary fashion illustration. Clean stylish outfit — tailored jacket or elevated streetwear. Neutral and earth tones with one bold accent. Background: moody urban architecture at dusk, soft bokeh city lights. Editorial and sophisticated.`,
  'fantasy-modern': `Fantasy-modern fusion. Magical elements woven into contemporary fashion — glowing accessories, iridescent fabrics. Background: neon-lit alley meets starlit sky. Cinematic and otherworldly.`,
  celestial: `Celestial fine art illustration. Flowing cosmic robes adorned with stars and moon phases, silver and indigo palette, constellation details. Background: deep space nebula with soft aurora light. Ethereal and divine.`,
  royal: `Regal portrait illustration. Elaborate noble attire — rich velvets, gold embroidery, a crown or ornate headpiece. Deep jewel tones. Background: grand candlelit hall or palace balcony at dusk. Majestic and commanding.`,
  streetwear: `Urban fashion illustration. Stylish streetwear — oversized jacket, designer sneakers, bold graphic tee or cargo pants. Dark moody background: rain-slicked city street at night with warm neon reflections. Cool and atmospheric.`,
  futuristic: `Sci-fi concept art illustration. Sleek futuristic outfit — form-fitting suit, glowing tech accessories, holographic details. Background: gleaming megacity skyline or neon-lit space station corridor. Sharp and cinematic.`,
  nature: `Nature-inspired illustration. Flowing earthy garments woven with floral and botanical details, warm greens and terracottas. Background: misty ancient forest with dappled golden light filtering through tall trees. Organic and peaceful.`,
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
    'The character must be clearly visible from head to toe with a clean readable silhouette.',
    'Use a vertical portrait composition. Dramatic lighting. Rich detail. Cinematic quality.',
    'Do not add text, watermarks, or logos.',
    details ? `Character details based on their self-description:\n${details}` : '',
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
    style: 'natural',
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
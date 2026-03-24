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

// ⏱ timeout wrapper
async function withTimeout<T>(promise: Promise<T>, ms = 45000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms)
  )
  return Promise.race([promise, timeout])
}

// 🎨 ALL STYLES (OPTIMIZED)
const STYLE_DIRECTIONS: Record<string, string> = {
  fantasy:
    `Stylized semi-realistic fantasy portrait. Cinematic lighting, deep shadows, glowing magical accents, rich jewel tones, mystical environment.`,

  earthbound:
    `Stylized semi-realistic grounded portrait. Natural lighting, soft shadows, warm tones, intimate and elegant styling.`,

  'mythic-modern':
    `Stylized semi-realistic mythic-modern portrait. Dramatic lighting, modern fashion with subtle magical elements, strong depth and contrast.`,

  celestial:
    `Stylized semi-realistic celestial portrait. Moonlit lighting, cool tones, glowing highlights, ethereal cosmic atmosphere.`,

  regal:
    `Stylized semi-realistic regal portrait. Warm golden lighting, rich fabrics, royal elegance, strong facial structure.`,

  nocturne:
    `Stylized semi-realistic nocturne portrait. Night lighting, deep shadows, colored highlights, cinematic mood.`,

  'luminous-future':
    `Stylized semi-realistic futuristic portrait. Soft glowing light, reflective materials, elegant sci-fi aesthetic.`,

  garden:
    `Stylized semi-realistic nature portrait. Dappled sunlight, warm greens, organic textures, soft atmospheric depth.`,

  sanctuary:
    `Stylized semi-realistic sacred portrait. Candlelit glow, soft shadows, calm and spiritual atmosphere.`,

  'velvet-gothic':
    `Stylized semi-realistic gothic portrait. Dark tones, velvet textures, dramatic lighting, romantic mood.`,

  tideborn:
    `Stylized semi-realistic oceanic portrait. Cool blue lighting, flowing fabrics, reflective watery atmosphere.`,
}

// 🎯 BALANCED PROMPT BUILDER
function buildAvatarPrompt(answers: string[], style?: string, feedback?: string) {
  const details = answers
    .map((a, i) => `${i + 1}. ${normalizeDetail(a)}`)
    .join('\n')

  const styleKey = (style || '').toLowerCase().replace(/\s+/g, '-')
  const styleDirection = STYLE_DIRECTIONS[styleKey] || STYLE_DIRECTIONS['earthbound']

  return `
Create a vertical full-body stylized semi-realistic character portrait.

${styleDirection}

Requirements:
- Strong directional lighting with visible shadow depth
- Sculpted face (cheekbones, jawline, nose highlights)
- Realistic fabric folds and textures
- Character centered, full body visible
- Clean silhouette, cinematic pose
- Subtle atmospheric background
- High-end character concept art (NOT cartoon, NOT flat)

Character details:
${details}

${feedback ? `Revision note: ${normalizeDetail(feedback)}` : ''}
`
}

// 🧠 PRIMARY GENERATOR
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
    quality: mode === 'reimagine' ? 'low' : 'high',
    output_format: 'jpeg',
    user: userId || undefined,
  })

  const image = response.data?.[0]

  if (!image?.b64_json) {
    console.error('GPT IMAGE BAD RESPONSE:', response)
    throw new Error('No image returned from gpt-image-1')
  }

  return {
    imageUrl: `data:image/jpeg;base64,${image.b64_json}`,
    revisedPrompt: image.revised_prompt || prompt,
  }
}

// 🔁 FALLBACK
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

  if (image?.b64_json) {
    return {
      imageUrl: `data:image/png;base64,${image.b64_json}`,
      revisedPrompt: image.revised_prompt || prompt,
    }
  }

  console.error('DALLE BAD RESPONSE:', response)
  throw new Error('dall-e-3 returned no image')
}

// 🚀 API ROUTE
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

    const prompt = buildAvatarPrompt(orderedAnswers, style, feedback)
    const openai = new OpenAI({ apiKey: openaiKey })
    const generationMode: GenerationMode = mode === 'reimagine' ? 'reimagine' : 'create'

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

      try {
        const fallback = await withTimeout(
          generateWithDalle(openai, prompt, userId, generationMode),
          45000,
        )

        return NextResponse.json({
          imageUrl: fallback.imageUrl,
          prompt: fallback.revisedPrompt,
        })
      } catch (fallbackError) {
        console.error('FALLBACK FAILED:', fallbackError)

        return NextResponse.json(
          { error: 'Image generation failed (both models).' },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    console.error('ROUTE ERROR:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate avatar.' },
      { status: 500 }
    )
  }
}

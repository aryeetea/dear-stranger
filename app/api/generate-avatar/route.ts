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

// ⏱ timeout wrapper (prevents infinite loading)
async function withTimeout<T>(promise: Promise<T>, ms = 30000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms)
  )
  return Promise.race([promise, timeout])
}

// 🎯 shortened but still high-quality prompt
function buildAvatarPrompt(answers: string[], style?: string, feedback?: string) {
  const details = answers
    .map((a, i) => `${i + 1}. ${normalizeDetail(a)}`)
    .join('\n')

  return `
Create a vertical full-body stylized semi-realistic character portrait.

Style: mythic-modern, cinematic lighting, strong shadows and highlights, volumetric rendering, elegant anatomy, refined fashion, glowing accents.

Requirements:
- Strong directional lighting with shadow depth
- Sculpted face (cheekbones, jawline, nose highlights)
- Realistic fabric folds and material textures
- Subtle atmospheric background (not distracting)
- Character centered, full body visible
- Clean silhouette, cinematic pose
- Premium character concept art quality (not cartoon, not flat)

Character details:
${details}

${feedback ? `Revision note: ${normalizeDetail(feedback)}` : ''}
`
}

// 🧠 primary generator (FIXED)
async function generateWithGptImage(
  openai: OpenAI,
  prompt: string,
  mode: GenerationMode
) {
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: mode === 'reimagine' ? '1024x1024' : '1024x1536',
    quality: 'medium',
  })

  const image = response.data?.[0]

  if (!image?.b64_json) {
    console.error('GPT IMAGE BAD RESPONSE:', response)
    throw new Error('No image returned from gpt-image-1')
  }

  return {
    imageUrl: `data:image/png;base64,${image.b64_json}`,
    revisedPrompt: image.revised_prompt || prompt,
  }
}

// 🔁 fallback (FIXED)
async function generateWithDalle(
  openai: OpenAI,
  prompt: string,
  mode: GenerationMode
) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    size: mode === 'reimagine' ? '1024x1024' : '1024x1792',
  })

  const image = response.data?.[0]

  if (image?.url) {
    return {
      imageUrl: image.url,
      revisedPrompt: image.revised_prompt || prompt,
    }
  }

  console.error('DALLE BAD RESPONSE:', response)
  throw new Error('dall-e-3 returned no image')
}

// 🚀 API route
export async function POST(req: Request) {
  try {
    const { answers, feedback, style, mode } = await req.json()

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
      // 🟢 PRIMARY (with timeout)
      const result = await withTimeout(
        generateWithGptImage(openai, prompt, generationMode),
        30000
      )

      return NextResponse.json({
        imageUrl: result.imageUrl,
        prompt: result.revisedPrompt,
      })
    } catch (primaryError) {
      console.error('PRIMARY FAILED:', primaryError)

      try {
        // 🔁 FALLBACK (with timeout)
        const fallback = await withTimeout(
          generateWithDalle(openai, prompt, generationMode),
          30000
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